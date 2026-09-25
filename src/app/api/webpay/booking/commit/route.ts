import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, escapeHtml } from "@/lib/email";
import { getWebpayTransaction } from "@/lib/webpay";
import { getSettings } from "@/actions/admin-settings";
import { computeAvailableSlots, getBlockingBookings } from "@/lib/availability";

async function cancelAbandoned(buyOrder: string | null) {
  if (!buyOrder) return;
  await prisma.booking.updateMany({
    where: { id: buyOrder, status: "PENDING" },
    data: { status: "CANCELLED" }
  }).catch(() => {});
}

async function processPayment(tokenWs: string | null, tbkToken: string | null, abortBuyOrder: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (tbkToken) {
    await cancelAbandoned(abortBuyOrder);
    return NextResponse.redirect(`${baseUrl}/agendar?error=Pago%20Cancelado&token_ws=${tbkToken || ""}`);
  }

  if (!tokenWs) {
    return NextResponse.redirect(`${baseUrl}/agendar?error=Token%20inválido`);
  }

  try {
    const commitResponse = await getWebpayTransaction().commit(tokenWs);
    const bookingId = commitResponse.buy_order;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { services: { select: { name: true, duration: true } } }
    });

    if (!booking) {
      return NextResponse.redirect(`${baseUrl}/agendar?error=Reserva%20no%20encontrada`);
    }

    if (commitResponse.status === "AUTHORIZED") {
      // Pago que llega para una reserva ya CANCELADA (abandono pasado el
      // tiempo de retención, o cancelada por el admin): el horario pudo
      // haberlo tomado otra persona. Solo se confirma si sigue libre; si no,
      // se reversa el cobro en Transbank.
      if (booking.status === "CANCELLED") {
        const settings = await getSettings();
        const day = booking.date.toISOString().substring(0, 10);
        const duration = booking.services.reduce((sum, s) => sum + s.duration, 0);
        const stillFree = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${"booking:" + day}))`;
          const blocking = await getBlockingBookings(tx, day, booking.id);
          const free = computeAvailableSlots(day, duration, settings, blocking, null)
            .includes(booking.startTime);
          if (free) {
            await tx.booking.update({ where: { id: booking.id }, data: { status: "PENDING" } });
          }
          return free;
        });

        if (!stillFree) {
          const refunded = await getWebpayTransaction()
            .refund(tokenWs, commitResponse.amount)
            .then(() => true)
            .catch((err: unknown) => {
              console.error("No se pudo reversar el pago de una reserva sin horario", booking.id, err);
              return false;
            });
          await prisma.booking.update({
            where: { id: booking.id },
            data: { paymentId: tokenWs, paymentStatus: refunded ? "REFUNDED" : booking.paymentType === "FULL" ? "PAID_FULL" : "PAID_RESERVATION" },
          });
          await sendEmail({
            to: process.env.OWNER_EMAIL || "contacto@lubrimax.cl",
            subject: `PAGO SOBRE RESERVA CANCELADA - ${booking.customerName}`,
            html: `<p>Llegó un pago de $${commitResponse.amount} para la reserva ${booking.id}, que ya estaba cancelada y cuyo horario fue ocupado.</p>
                   <p>${refunded ? "El pago se reversó automáticamente." : "<strong>No se pudo reversar automáticamente: revisar en Transbank y contactar al cliente.</strong>"}</p>`,
          });
          const reason = refunded
            ? "El horario ya no estaba disponible. Reversamos tu pago."
            : "El horario ya no estaba disponible. Te contactaremos para devolver tu pago.";
          return NextResponse.redirect(`${baseUrl}/agendar?error=${encodeURIComponent(reason)}`);
        }
        booking.status = "PENDING";
      }

      if (booking.status !== "CONFIRMED") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            paymentStatus: booking.paymentType === "FULL" ? "PAID_FULL" : "PAID_RESERVATION",
            paymentId: tokenWs,
            // Registro del pago: el saldo en el Tablero se calcula con esto.
            payments: { create: { amount: commitResponse.amount, method: "WEBPAY" } },
          }
        });

        if (booking.customerEmail) {
          const [y, m, d] = booking.date.toISOString().substring(0, 10).split("-");
          const friendlyDate = `${d}/${m}/${y}`;
          const paidLabel = booking.paymentType === "FULL" ? "el servicio completo" : "la seña de reserva (20%)";

          const ownerEmail = process.env.OWNER_EMAIL || "contacto@lubrimax.cl";
          const adminEmailResult = await sendEmail({
            to: ownerEmail,
            subject: `NUEVA RESERVA - ${booking.customerName} - ${friendlyDate} ${booking.startTime}`,
            html: (
              `<h1>Nueva Reserva Pagada</h1>
               <p><strong>Cliente:</strong> ${escapeHtml(booking.customerName)} (${escapeHtml(booking.customerPhone)})</p>
               <p><strong>Vehículo:</strong> ${escapeHtml(booking.vehicleMake)} ${escapeHtml(booking.vehicleModel)}</p>
               <p><strong>Fecha y Hora:</strong> ${friendlyDate} de ${booking.startTime} a ${booking.endTime}</p>
               <p><strong>Servicios:</strong> ${escapeHtml(booking.services.map(s => s.name).join(' + '))}</p>
               <p><strong>Monto pagado (${paidLabel}):</strong> $${booking.amount?.toLocaleString("es-CL")}</p>
               <p><a href="${baseUrl}/admin">Ver en panel de administración</a></p>`
            )
          });
          if (!adminEmailResult.success) {
            console.error("No se pudo notificar al administrador:", adminEmailResult.error);
          }

          const emailResult = await sendEmail({
            to: booking.customerEmail,
            subject: `Confirmación de tu hora en LUBRIMAX - ${friendlyDate}`,
            html: (
              `<h1>¡Hola ${escapeHtml(booking.customerName)}!</h1>
               <p>Tu reserva para <strong>${escapeHtml(booking.services.map(s => s.name).join(' + '))}</strong> quedó confirmada.</p>
               <p>Fecha: ${friendlyDate}<br/>Hora: ${booking.startTime} - ${booking.endTime}</p>
               <p>Vehículo: ${escapeHtml(booking.vehicleMake)} ${escapeHtml(booking.vehicleModel)}</p>
               <p>Pagaste ${paidLabel}: $${booking.amount?.toLocaleString("es-CL")}</p>
               <p>Te esperamos en Av. Gabriela Mistral 3061, La Serena.</p>`
            )
          });
          if (!emailResult.success) {
            console.error("No se pudo enviar el correo de confirmación de reserva", booking.id, emailResult.error);
          }
        }
      }

      return NextResponse.redirect(`${baseUrl}/agendar?success=true&booking=${booking.id}&token_ws=${tokenWs}`);
    } else {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" }
      });
      return NextResponse.redirect(`${baseUrl}/agendar?error=Pago%20Rechazado&token_ws=${tokenWs}`);
    }
  } catch (error: any) {
    console.error("Webpay Booking Commit Error:", error);
    return NextResponse.redirect(`${baseUrl}/agendar?error=Error%20interno%20al%20confirmar%20el%20pago`);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return processPayment(
    url.searchParams.get("token_ws"),
    url.searchParams.get("TBK_TOKEN"),
    url.searchParams.get("TBK_ORDEN_COMPRA")
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  return processPayment(
    formData.get("token_ws") as string | null,
    formData.get("TBK_TOKEN") as string | null,
    formData.get("TBK_ORDEN_COMPRA") as string | null
  );
}

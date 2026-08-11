import { NextResponse } from "next/server";
import { WebpayPlus } from "transbank-sdk";
import { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from "transbank-sdk";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { format } from "date-fns";

const tx = new WebpayPlus.Transaction(
  new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
);

async function cancelAbandoned(buyOrder: string | null) {
  if (!buyOrder) return;
  // buyOrder es el booking.id (ver webpay/booking/create). Solo tocamos
  // reservas que sigan PENDING: si ya se confirmó por otra vía, no la tocamos.
  await prisma.booking.updateMany({
    where: { id: buyOrder, status: "PENDING" },
    data: { status: "CANCELLED" }
  }).catch(() => {});
}

export async function GET(request: Request) {
  // Transbank puede enviar por GET en caso de aborto (tbk_token_anulado)
  const url = new URL(request.url);
  const tbkToken = url.searchParams.get("TBK_TOKEN");
  const tokenWs = url.searchParams.get("token_ws");
  const abortBuyOrder = url.searchParams.get("TBK_ORDEN_COMPRA");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (tbkToken && abortBuyOrder) {
    await cancelAbandoned(abortBuyOrder);
    return NextResponse.redirect(`${baseUrl}/agendar?error=Pago%20Cancelado`);
  }

  if (!tokenWs) {
    return NextResponse.redirect(`${baseUrl}/agendar?error=Error%20en%20Transbank`);
  }

  return NextResponse.redirect(`${baseUrl}/agendar?error=Operación%20inválida`);
}

export async function POST(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const formData = await request.formData();
    const tokenWs = formData.get("token_ws") as string;
    const tbkToken = formData.get("TBK_TOKEN") as string;
    const abortBuyOrder = formData.get("TBK_ORDEN_COMPRA") as string;

    if (tbkToken) {
      await cancelAbandoned(abortBuyOrder || null);
      return NextResponse.redirect(`${baseUrl}/agendar?error=Pago%20Cancelado`);
    }

    if (!tokenWs) {
      return NextResponse.redirect(`${baseUrl}/agendar?error=Token%20inválido`);
    }

    const commitResponse = await tx.commit(tokenWs);
    const bookingId = commitResponse.buy_order;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { service: { select: { name: true, duration: true } } }
    });

    if (!booking) {
      return NextResponse.redirect(`${baseUrl}/agendar?error=Reserva%20no%20encontrada`);
    }

    if (commitResponse.status === "AUTHORIZED") {
      // Idempotencia: si Transbank reintenta el callback o el usuario
      // recarga la página de retorno, no reprocesamos ni reenviamos el mail.
      if (booking.status !== "CONFIRMED") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            paymentStatus: booking.paymentType === "FULL" ? "PAID_FULL" : "PAID_RESERVATION",
          }
        });

        if (booking.customerEmail) {
          const friendlyDate = format(booking.date, "dd/MM/yyyy");
          const paidLabel = booking.paymentType === "FULL" ? "el servicio completo" : "la seña de reserva (20%)";
          await sendEmail({
            to: booking.customerEmail,
            subject: `Confirmación de tu hora en LUBRIMAX - ${friendlyDate}`,
            react: (
              `<h1>¡Hola ${booking.customerName}!</h1>
               <p>Tu reserva para <strong>${booking.service.name}</strong> quedó confirmada.</p>
               <p>Fecha: ${friendlyDate}<br/>Hora: ${booking.startTime} - ${booking.endTime}</p>
               <p>Vehículo: ${booking.vehicleMake} ${booking.vehicleModel}</p>
               <p>Pagaste ${paidLabel}: $${booking.amount?.toLocaleString("es-CL")}</p>
               <p>Te esperamos en Av. Gabriela Mistral 3061, La Serena.</p>`
            ) as any // Cast temporal para evitar error tipográfico si no usamos @react-email yet
          });
        }
      }

      return NextResponse.redirect(`${baseUrl}/agendar?success=true&booking=${booking.id}`);
    } else {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "CANCELLED" }
      });
      return NextResponse.redirect(`${baseUrl}/agendar?error=Pago%20Rechazado`);
    }
  } catch (error: any) {
    console.error("Webpay Booking Commit Error:", error);
    return NextResponse.redirect(`${baseUrl}/agendar?error=Error%20interno%20al%20confirmar%20el%20pago`);
  }
}

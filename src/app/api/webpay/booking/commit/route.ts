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
      if (booking.status !== "CONFIRMED") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: "CONFIRMED",
            paymentStatus: booking.paymentType === "FULL" ? "PAID_FULL" : "PAID_RESERVATION",
            paymentId: tokenWs
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
            ) as any
          });
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

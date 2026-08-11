import { NextResponse } from "next/server";
import { WebpayPlus } from "transbank-sdk";
import { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from "transbank-sdk";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { revalidateTag } from "next/cache";

const tx = new WebpayPlus.Transaction(
  new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
);

async function processPayment(tokenWs: string | null, tbkToken: string | null, abortToken: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (tbkToken || abortToken) {
    return NextResponse.redirect(`${baseUrl}/checkout?error=Pago%20Cancelado`);
  }

  if (!tokenWs) {
    return NextResponse.redirect(`${baseUrl}/checkout?error=Token%20inválido`);
  }

  try {
    const commitResponse = await tx.commit(tokenWs);

    if (commitResponse.status === "AUTHORIZED") {
      const orderId = commitResponse.buy_order;
      
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID", paymentId: tokenWs },
        include: { items: true, customer: true }
      });

      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }
      revalidateTag("products", "max");

      await sendEmail({
        to: order.customer.email,
        subject: `Confirmación de Orden #${order.id.slice(-8).toUpperCase()} - Lubrimax`,
        react: (
          `<h1>¡Gracias por tu compra, ${order.customer.name}!</h1>
           <p>Hemos recibido tu orden y estamos procesándola.</p>
           <p>Monto Pagado: $${order.total}</p>`
        ) as any
      });

      return NextResponse.redirect(`${baseUrl}/checkout?success=true&order=${order.id}`);
    } else {
      await prisma.order.updateMany({
        where: { paymentId: tokenWs },
        data: { status: "FAILED" }
      });
      return NextResponse.redirect(`${baseUrl}/checkout?error=Pago%20Rechazado`);
    }
  } catch (error: any) {
    console.error("Webpay Commit Error:", error);
    return NextResponse.redirect(`${baseUrl}/checkout?error=Error%20interno%20al%20confirmar%20el%20pago`);
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

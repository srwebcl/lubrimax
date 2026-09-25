import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, escapeHtml } from "@/lib/email";
import { revalidateTag } from "next/cache";
import { getWebpayTransaction } from "@/lib/webpay";

async function processPayment(tokenWs: string | null, tbkToken: string | null, abortToken: string | null) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (tbkToken || abortToken) {
    return NextResponse.redirect(`${baseUrl}/checkout?error=Pago%20Cancelado&token_ws=${tbkToken || ""}`);
  }

  if (!tokenWs) {
    return NextResponse.redirect(`${baseUrl}/checkout?error=Token%20inválido`);
  }

  try {
    const commitResponse = await getWebpayTransaction().commit(tokenWs);

    if (commitResponse.status === "AUTHORIZED") {
      const orderId = commitResponse.buy_order;
      
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID", paymentId: tokenWs },
        include: { items: true, customer: true }
      });

      if (order.discountCode) {
        await prisma.discountCode
          .update({ where: { code: order.discountCode }, data: { usedCount: { increment: 1 } } })
          .catch((err) => console.error("No se pudo registrar el uso del cupón", order.discountCode, err));
      }

      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }
      revalidateTag("products", "max");

      const emailResult = await sendEmail({
        to: order.customer.email,
        subject: `Confirmación de Orden #${order.id.slice(-8).toUpperCase()} - Lubrimax`,
        html: (
          `<h1>¡Gracias por tu compra, ${escapeHtml(order.customer.name)}!</h1>
           <p>Hemos recibido tu orden y estamos procesándola.</p>
           <p>Monto Pagado: $${order.total}</p>`
        )
      });
      if (!emailResult.success) {
        console.error("No se pudo enviar el correo de confirmación de orden", order.id, emailResult.error);
      }

      return NextResponse.redirect(`${baseUrl}/checkout?success=true&order=${order.id}&token_ws=${tokenWs}`);
    } else {
      await prisma.order.updateMany({
        where: { paymentId: tokenWs },
        data: { status: "FAILED" }
      });
      return NextResponse.redirect(`${baseUrl}/checkout?error=Pago%20Rechazado&token_ws=${tokenWs}`);
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

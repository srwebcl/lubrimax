import { NextResponse } from "next/server";
import { WebpayPlus } from "transbank-sdk";
import { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from "transbank-sdk";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { revalidateTag } from "next/cache";

const tx = new WebpayPlus.Transaction(
  new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
);

export async function GET(request: Request) {
  // Transbank puede enviar por GET en caso de aborto (tbk_token_anulado)
  const url = new URL(request.url);
  const tbkToken = url.searchParams.get("TBK_TOKEN");
  const tokenWs = url.searchParams.get("token_ws");
  const abortToken = url.searchParams.get("TBK_ORDEN_COMPRA");
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Usuario abortó el pago
  if (tbkToken && abortToken) {
    return NextResponse.redirect(`${baseUrl}/checkout?error=Pago%20Cancelado`);
  }

  // Flujo normal GET fallido
  if (!tokenWs) {
    return NextResponse.redirect(`${baseUrl}/checkout?error=Error%20en%20Transbank`);
  }

  return NextResponse.redirect(`${baseUrl}/checkout?error=Operación%20inválida`);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const tokenWs = formData.get("token_ws") as string;
    const tbkToken = formData.get("TBK_TOKEN") as string;
    
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Si TBK_TOKEN viene, significa pago anulado
    if (tbkToken) {
      return NextResponse.redirect(`${baseUrl}/checkout?error=Pago%20Cancelado`);
    }

    if (!tokenWs) {
      return NextResponse.redirect(`${baseUrl}/checkout?error=Token%20inválido`);
    }

    // Confirmar pago con Transbank
    const commitResponse = await tx.commit(tokenWs);

    if (commitResponse.status === "AUTHORIZED") {
      // Buscar la orden por BuyOrder (que es el ID de la BD)
      const orderId = commitResponse.buy_order;
      
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: "PAID" },
        include: { items: true, customer: true }
      });

      // Reducir stock
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }
      revalidateTag("products", "max");

      // Enviar correo de confirmación (Mock o Real)
      await sendEmail({
        to: order.customer.email,
        subject: `Confirmación de Orden #${order.id.slice(-8).toUpperCase()} - Lubrimax`,
        react: (
          `<h1>¡Gracias por tu compra, ${order.customer.name}!</h1>
           <p>Hemos recibido tu orden y estamos procesándola.</p>
           <p>Monto Pagado: $${order.total}</p>`
        ) as any // Cast temporal para evitar error tipográfico si no usamos @react-email yet
      });

      // Limpiar carrito en el cliente (lo haremos leyendo un param de exito)
      return NextResponse.redirect(`${baseUrl}/perfil?success=true&order=${order.id}`);
    } else {
      // Rechazado
      await prisma.order.updateMany({
        where: { paymentId: tokenWs },
        data: { status: "FAILED" }
      });
      return NextResponse.redirect(`${baseUrl}/checkout?error=Pago%20Rechazado`);
    }

  } catch (error: any) {
    console.error("Webpay Commit Error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/checkout?error=Error%20interno%20al%20confirmar%20el%20pago`);
  }
}

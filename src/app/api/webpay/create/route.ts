import { NextResponse } from "next/server";
import { WebpayPlus } from "transbank-sdk";
import { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from "transbank-sdk";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

// Configurar Webpay para modo Integración (Pruebas)
const tx = new WebpayPlus.Transaction(
  new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
);

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    let customerSession = cookieStore.get('lubrimax_customer_session')?.value;
    
    const body = await request.json();
    const { amount, items, customerName, customerEmail, shippingType, address, city, couponCode } = body;

    if (!amount || amount <= 0 || !items || items.length === 0) {
      return NextResponse.json({ error: "Carrito vacío o monto inválido." }, { status: 400 });
    }

    // Si no hay sesión, usar los datos de invitado para crear o encontrar al cliente
    if (!customerSession) {
      if (!customerName || !customerEmail) {
        return NextResponse.json({ error: "Faltan datos de cliente." }, { status: 400 });
      }

      let guest = await prisma.customer.findUnique({ where: { email: customerEmail } });
      if (!guest) {
        guest = await prisma.customer.create({
          data: {
            name: customerName,
            email: customerEmail,
            password: "GUEST_" + Math.random().toString(36).slice(-8)
          }
        });
      }
      customerSession = guest.id;
    }

    // Validar y registrar uso de cupón si existe
    let discountTotal = 0;
    if (couponCode) {
      const coupon = await prisma.discountCode.findUnique({ where: { code: couponCode } });
      if (coupon && coupon.isActive) {
        await prisma.discountCode.update({
          where: { code: couponCode },
          data: { usedCount: { increment: 1 } }
        });
      }
    }

    // Crear la orden en la BD (PENDING)
    const order = await prisma.order.create({
      data: {
        total: amount,
        customerId: customerSession,
        status: "PENDING",
        shippingType: shippingType || "PICKUP",
        address: address || null,
        city: city || null,
        discountCode: couponCode || null,
        discountTotal: discountTotal,
        items: {
          create: items.map((item: any) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        }
      }
    });

    // Iniciar Transacción en Webpay
    const buyOrder = order.id;
    const sessionId = customerSession;
    
    // Configurar URL de retorno absoluto (importante para producción vs dev)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const returnUrl = `${baseUrl}/api/webpay/commit`;

    const createResponse = await tx.create(buyOrder, sessionId, amount, returnUrl);

    // Guardar el token en la orden
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentId: createResponse.token }
    });

    return NextResponse.json({
      token: createResponse.token,
      url: createResponse.url
    });

  } catch (error: any) {
    console.error("Webpay Create Error:", error);
    return NextResponse.json({ error: "Error al iniciar el pago con Transbank." }, { status: 500 });
  }
}

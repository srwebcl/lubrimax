import { NextResponse } from "next/server";
import { WebpayPlus } from "transbank-sdk";
import { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from "transbank-sdk";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyCustomerSessionToken } from "@/lib/customer-session";
import { storeCheckoutSchema, flattenZodError } from "@/lib/validation";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";

// Configurar Webpay para modo Integración (Pruebas)
const tx = new WebpayPlus.Transaction(
  new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
);

// Recalcula el total desde los precios reales en la BD. Nunca confiar en el
// monto/precio que envía el cliente: viene de localStorage y es manipulable.
async function resolveOrderItems(cartItems: { id: string; quantity: number }[]) {
  // El id de un item con variante viene como "productId-variantId" (ver CartProvider/tienda/[id])
  const productIds = [...new Set(cartItems.map((item) => String(item.id).split("-")[0]))];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  const orderItems: { productId: string; quantity: number; price: number }[] = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Cantidad inválida en el carrito.");
    }

    const rawId = String(item.id);
    const [productId, variantId] = rawId.split("-");
    const product = productById.get(productId);
    if (!product || !product.isActive) {
      throw new Error(`Producto no disponible: ${rawId}`);
    }

    let price = product.price;
    if (variantId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) throw new Error(`Producto no disponible: ${rawId}`);
      price = variant.price ?? product.price;
    }

    subtotal += price * quantity;
    orderItems.push({ productId, quantity, price });
  }

  return { orderItems, subtotal };
}

async function resolveDiscount(couponCode: string | undefined, subtotal: number) {
  if (!couponCode) return { discountTotal: 0, appliedCode: null as string | null };

  const coupon = await prisma.discountCode.findUnique({ where: { code: couponCode.toUpperCase() } });
  const isValid =
    coupon &&
    coupon.isActive &&
    (!coupon.validUntil || new Date() <= coupon.validUntil) &&
    (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit);

  if (!isValid) return { discountTotal: 0, appliedCode: null };

  await prisma.discountCode.update({
    where: { code: coupon.code },
    data: { usedCount: { increment: 1 } },
  });

  return { discountTotal: Math.round(subtotal * (coupon.discountPct / 100)), appliedCode: coupon.code };
}

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromRequest(request);
    const limit = checkRateLimit(`checkout-create:${ip}`, 15, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Demasiados intentos de compra. Espera unos minutos." }, { status: 429 });
    }

    const cookieStore = await cookies();
    let customerId = await verifyCustomerSessionToken(cookieStore.get('lubrimax_customer_session')?.value);

    const body = await request.json();
    const parsed = storeCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }
    const { items, customerName, customerEmail, shippingType, address, city, couponCode } = parsed.data;

    // Si no hay sesión válida, usar los datos de invitado para crear o encontrar al cliente
    if (!customerId) {
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
      customerId = guest.id;
    }

    let orderItems, subtotal;
    try {
      ({ orderItems, subtotal } = await resolveOrderItems(items));
    } catch (validationError: any) {
      return NextResponse.json({ error: validationError.message }, { status: 400 });
    }

    const { discountTotal, appliedCode } = await resolveDiscount(couponCode, subtotal);
    const amount = subtotal - discountTotal;

    if (amount <= 0) {
      return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
    }

    // Crear la orden en la BD (PENDING)
    const order = await prisma.order.create({
      data: {
        total: amount,
        customerId: customerId,
        status: "PENDING",
        shippingType: shippingType || "PICKUP",
        address: address || null,
        city: city || null,
        discountCode: appliedCode,
        discountTotal,
        items: {
          create: orderItems
        }
      }
    });

    // Iniciar Transacción en Webpay
    const buyOrder = order.id;
    const sessionId = customerId;

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

import { NextResponse } from "next/server";
import { WebpayPlus } from "transbank-sdk";
import { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from "transbank-sdk";
import { prisma } from "@/lib/prisma";
import { addMinutes, format } from "date-fns";
import { getExactPrice, RESERVATION_PERCENT } from "@/lib/booking-constants";
import { getSessionCustomer } from "@/actions/customer-auth";
import { bookingPaymentSchema, flattenZodError } from "@/lib/validation";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";

// Configurar Webpay para modo Integración (Pruebas) — mismo patrón que
// src/app/api/webpay/create/route.ts (checkout de la tienda).
const tx = new WebpayPlus.Transaction(
  new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration)
);

// Recalcula la disponibilidad del horario contra la BD (misma regla que
// getAvailableSlots en actions/booking.ts, inline aquí para no importar un
// "use server" module dentro de un Route Handler).
async function isSlotStillAvailable(dateString: string, startTime: string, serviceDuration: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const queryStart = new Date(year, month - 1, day, 0, 0, 0, 0);
  const queryEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
  const pendingCutoff = new Date(Date.now() - 20 * 60 * 1000);

  const [sHour, sMin] = startTime.split(":").map(Number);
  const slotStart = new Date(year, month - 1, day, sHour, sMin, 0, 0);
  const slotEnd = addMinutes(slotStart, serviceDuration);

  // Chequeo de colisión contra todas las reservas activas del día.
  const existing = await prisma.booking.findMany({
    where: {
      date: { gte: queryStart, lte: queryEnd },
      OR: [
        { status: "CONFIRMED" },
        { status: "PENDING", createdAt: { gte: pendingCutoff } }
      ]
    }
  });

  for (const booking of existing) {
    const [bHour, bMin] = booking.startTime.split(":").map(Number);
    const [eHour, eMin] = booking.endTime.split(":").map(Number);
    const bookingStart = new Date(year, month - 1, day, bHour, bMin, 0, 0);
    const bookingEnd = new Date(year, month - 1, day, eHour, eMin, 0, 0);

    if (slotStart < bookingEnd && slotEnd > bookingStart) {
      return false;
    }
  }
  return true;
}

export async function POST(request: Request) {
  let bookingId: string | null = null;

  try {
    const ip = getClientIpFromRequest(request);
    const limit = checkRateLimit(`booking-create:${ip}`, 10, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Demasiados intentos de reserva. Espera unos minutos." }, { status: 429 });
    }

    const body = await request.json();
    const parsed = bookingPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: flattenZodError(parsed.error) }, { status: 400 });
    }
    const { date, startTime, serviceId, vehicleType, plate, customerName, customerPhone, customerEmail, paymentType } = parsed.data;

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado." }, { status: 404 });
    }

    const stillAvailable = await isSlotStillAvailable(date, startTime, service.duration);
    if (!stillAvailable) {
      return NextResponse.json({ error: "El horario seleccionado ya no está disponible." }, { status: 409 });
    }

    // Precio calculado 100% en servidor: nunca confiar en el monto que
    // pudiera mandar el cliente. Descuento de Club Lubrimax leído desde la
    // sesión de cookie (no desde el body).
    let totalAmount = getExactPrice(service, vehicleType);
    const customer = await getSessionCustomer();
    const discountPercent = customer?.membership?.discountPercent || 0;
    if (discountPercent > 0) {
      totalAmount = Math.round(totalAmount - totalAmount * (discountPercent / 100));
    }
    const reservationAmount = Math.round(totalAmount * RESERVATION_PERCENT);
    const amount = paymentType === "FULL" ? totalAmount : reservationAmount;

    if (amount <= 0) {
      return NextResponse.json({ error: "Monto inválido para este servicio." }, { status: 400 });
    }

    const [year, month, day] = date.split("-").map(Number);
    const [sHour, sMin] = startTime.split(":").map(Number);
    const start = new Date(year, month - 1, day, sHour, sMin, 0, 0);
    const end = addMinutes(start, service.duration);
    const endTimeStr = format(end, "HH:mm");

    // Reservamos el horario como PENDING antes de ir a Webpay para evitar
    // que otro cliente lo tome mientras este paga. Si el pago se abandona,
    // isSlotStillAvailable/getAvailableSlots lo liberan solos pasados 20 min.
    const booking = await prisma.booking.create({
      data: {
        date: new Date(date),
        startTime,
        endTime: endTimeStr,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        vehicleMake: vehicleType,
        vehicleModel: plate,
        serviceId,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentType,
        amount,
      }
    });
    bookingId = booking.id;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const returnUrl = `${baseUrl}/api/webpay/booking/commit`;

    const createResponse = await tx.create(booking.id, booking.id, amount, returnUrl);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentId: createResponse.token }
    });

    return NextResponse.json({ token: createResponse.token, url: createResponse.url });
  } catch (error: any) {
    console.error("Webpay Booking Create Error:", error);

    // No dejar el horario bloqueado si Transbank falló después de crear la reserva.
    if (bookingId) {
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } }).catch(() => {});
    }

    return NextResponse.json({ error: "Error al iniciar el pago con Transbank." }, { status: 500 });
  }
}

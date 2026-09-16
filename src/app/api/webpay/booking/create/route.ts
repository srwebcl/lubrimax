import { NextResponse } from "next/server";
import { WebpayPlus } from "transbank-sdk";
import { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from "transbank-sdk";
import { prisma } from "@/lib/prisma";
import { addMinutes, format } from "date-fns";
import { getExactPrice, RESERVATION_PERCENT } from "@/lib/booking-constants";
import { getSessionCustomer } from "@/actions/customer-auth";
import { bookingPaymentSchema, flattenZodError } from "@/lib/validation";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

import { getWebpayTransaction } from "@/lib/webpay";

// Interruptor TEMPORAL para probar el agendamiento en producción sin pasar
// por Webpay/Transbank de verdad. Se activa poniendo BOOKING_FREE_MODE=true
// en las variables de entorno (Vercel) y se desactiva sacando esa variable
// (o poniéndola en "false") — no requiere otro cambio de código. Mientras
// está prendido, TODAS las reservas quedan confirmadas gratis, sin cobrar
// nada; apagarlo apenas termine la prueba.
const FREE_MODE = process.env.BOOKING_FREE_MODE === "true";

const tx = getWebpayTransaction();

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
  let slotEnd = addMinutes(slotStart, serviceDuration);
  const endOfDay = new Date(year, month - 1, day, 18, 0, 0, 0); // Asumimos cierre 18:00
  if (slotEnd > endOfDay) {
    slotEnd = endOfDay;
  }

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
    const { date, startTime, serviceIds, selectedVariants, vehicleType, plate, make, model, customerName, customerPhone, customerEmail, paymentType } = parsed.data;

    const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
    if (services.length === 0) {
      return NextResponse.json({ error: "Servicios no encontrados." }, { status: 404 });
    }

    const totalDuration = services.reduce((sum, s) => {
      let duration = s.duration;
      if (s.variants && selectedVariants && selectedVariants[s.id]) {
        const variantsArr = Array.isArray(s.variants) ? s.variants : typeof s.variants === 'string' ? JSON.parse(s.variants) : [];
        const selectedVariant = variantsArr.find((v: any) => v.name === selectedVariants[s.id]);
        if (selectedVariant && selectedVariant.duration) {
          duration = selectedVariant.duration;
        }
      }
      return sum + duration;
    }, 0);
    const stillAvailable = await isSlotStillAvailable(date, startTime, totalDuration);
    if (!stillAvailable) {
      return NextResponse.json({ error: "El horario seleccionado ya no está disponible." }, { status: 409 });
    }

    // Precio calculado 100% en servidor: nunca confiar en el monto que
    // pudiera mandar el cliente. Descuento de Club Lubrimax leído desde la
    // sesión de cookie (no desde el body).
    let totalAmount = services.reduce((sum, s) => {
      let source = s;
      if (s.variants && selectedVariants && selectedVariants[s.id]) {
        const variantsArr = Array.isArray(s.variants) ? s.variants : typeof s.variants === 'string' ? JSON.parse(s.variants) : [];
        const selectedVariant = variantsArr.find((v: any) => v.name === selectedVariants[s.id]);
        if (selectedVariant) source = selectedVariant as any;
      }
      return sum + getExactPrice(source as any, vehicleType);
    }, 0);
    const customer = await getSessionCustomer();
    const discountPercent = customer?.membership?.discountPercent || 0;
    if (discountPercent > 0) {
      totalAmount = Math.round(totalAmount - totalAmount * (discountPercent / 100));
    }
    const reservationAmount = Math.round(totalAmount * RESERVATION_PERCENT);
    const amount = paymentType === "FULL" ? totalAmount : reservationAmount;

    if (amount <= 0 && !FREE_MODE) {
      return NextResponse.json({ error: "Monto inválido para este servicio." }, { status: 400 });
    }

    const [year, month, day] = date.split("-").map(Number);
    const [sHour, sMin] = startTime.split(":").map(Number);
    const start = new Date(year, month - 1, day, sHour, sMin, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 18, 0, 0, 0);

    let end = addMinutes(start, totalDuration);
    if (end > endOfDay) {
      end = endOfDay; // Tope al final del día para evitar wrap-arounds de Date
    }
    const endTimeStr = format(end, "HH:mm");

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // ── Modo de prueba: confirma la reserva al toque, sin cobrar ni tocar
    // Webpay. Precio real habría sido `amount`, pero queda en 0 para que se
    // note en la agenda que fue una reserva de prueba.
    if (FREE_MODE) {
      const freeBooking = await prisma.booking.create({
        data: {
          date: new Date(date),
          startTime,
          endTime: endTimeStr,
          customerName,
          customerPhone,
          customerEmail: customerEmail || null,
          vehicleMake: `${vehicleType} - ${make}`,
          vehicleModel: `${model} (Patente: ${plate})`,
          services: { connect: serviceIds.map(id => ({ id })) },
          selectedOptions: selectedVariants ?? undefined,
          status: "CONFIRMED",
          paymentStatus: "PAID_FULL",
          paymentType,
          paymentId: "FREE_TEST",
          amount: 0,
        },
        include: { services: { select: { name: true } } }
      });
      bookingId = freeBooking.id;

      if (freeBooking.customerEmail) {
        const friendlyDate = format(freeBooking.date, "dd/MM/yyyy");
        await sendEmail({
          to: freeBooking.customerEmail,
          subject: `Confirmación de tu hora en LUBRIMAX - ${friendlyDate}`,
          react: (
            `<h1>¡Hola ${freeBooking.customerName}!</h1>
             <p>Tu reserva para <strong>${freeBooking.services.map(s => s.name).join(' + ')}</strong> quedó confirmada.</p>
             <p>Fecha: ${friendlyDate}<br/>Hora: ${freeBooking.startTime} - ${freeBooking.endTime}</p>
             <p>Vehículo: ${freeBooking.vehicleMake} ${freeBooking.vehicleModel}</p>
             <p><em>Reserva de prueba, sin costo.</em></p>
             <p>Te esperamos en Av. Gabriela Mistral 3061, La Serena.</p>`
          ) as any
        });
      }

      return NextResponse.json({
        free: true,
        redirectUrl: `${baseUrl}/agendar?success=true&booking=${freeBooking.id}`,
      });
    }

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
        vehicleMake: `${vehicleType} - ${make}`,
        vehicleModel: `${model} (Patente: ${plate})`,
        services: { connect: serviceIds.map(id => ({ id })) },
        selectedOptions: selectedVariants ?? undefined,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentType,
        amount,
      }
    });
    bookingId = booking.id;

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

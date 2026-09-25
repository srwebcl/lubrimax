import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getExactPrice } from "@/lib/booking-constants";
import { getSessionCustomer } from "@/actions/customer-auth";
import { getSettings } from "@/actions/admin-settings";
import { bookingPaymentSchema, flattenZodError } from "@/lib/validation";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";
import { sendEmail, escapeHtml } from "@/lib/email";
import {
  computeAvailableSlots,
  computeEndTime,
  getBlockingBookings,
  totalDuration,
} from "@/lib/availability";
import { bookingDateFromDay } from "@/lib/chile-time";
import { formatPhone } from "@/lib/contact";
import { normalizePlate } from "@/lib/plate";

import { getWebpayTransaction } from "@/lib/webpay";
import { CLUB_ENABLED } from "@/lib/features";

// Interruptor TEMPORAL para probar el agendamiento en producción sin pasar
// por Webpay/Transbank de verdad. Se activa poniendo BOOKING_FREE_MODE=true
// en las variables de entorno (Vercel) y se desactiva sacando esa variable
// (o poniéndola en "false") — no requiere otro cambio de código. Mientras
// está prendido, TODAS las reservas quedan confirmadas gratis, sin cobrar
// nada; apagarlo apenas termine la prueba.
const FREE_MODE = process.env.BOOKING_FREE_MODE === "true";

class SlotTakenError extends Error {}

type ServiceWithVariants = {
  id: string;
  variants: unknown;
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
};

/** Precio del servicio para el tipo de vehículo, usando la variante elegida si existe. */
function servicePrice(s: ServiceWithVariants, vehicleType: string, selectedVariants?: Record<string, string>) {
  const chosen = selectedVariants?.[s.id];
  if (chosen) {
    let variants: unknown = s.variants;
    if (typeof variants === "string") {
      try {
        variants = JSON.parse(variants);
      } catch {
        variants = [];
      }
    }
    const variant = Array.isArray(variants)
      ? (variants as { name?: string; priceAuto?: number; priceSuv2?: number; priceSuv3?: number }[]).find(
          (v) => v.name === chosen
        )
      : undefined;
    if (variant) {
      return getExactPrice(
        {
          priceAuto: variant.priceAuto ?? null,
          priceSuv2: variant.priceSuv2 ?? null,
          priceSuv3: variant.priceSuv3 ?? null,
        },
        vehicleType
      );
    }
  }
  return getExactPrice(s, vehicleType);
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
    const { date, startTime, serviceIds, selectedVariants, vehicleType, plate, make, model, customerName, customerPhone, customerEmail } = parsed.data;
    // Política: quien reserva por la web paga el 100% del servicio. No hay
    // abono parcial (se ignora cualquier paymentType que mande el navegador).
    const paymentType = "FULL";

    const uniqueServiceIds = [...new Set(serviceIds)];
    const services = await prisma.service.findMany({ where: { id: { in: uniqueServiceIds } } });
    if (services.length !== uniqueServiceIds.length) {
      return NextResponse.json({ error: "Alguno de los servicios no existe." }, { status: 404 });
    }

    // Precio calculado 100% en servidor: nunca confiar en el monto que
    // pudiera mandar el cliente. Un servicio sin precio para este tipo de
    // vehículo (ej. "a cotizar") no se puede reservar online: antes sumaba
    // $0 y abarataba el total.
    const prices = services.map((s) => servicePrice(s, vehicleType, selectedVariants));
    if (!FREE_MODE && prices.some((p) => p <= 0)) {
      return NextResponse.json(
        { error: "Uno de los servicios elegidos no tiene precio online para tu vehículo. Contáctanos para cotizarlo." },
        { status: 400 }
      );
    }
    let totalAmount = prices.reduce((sum, p) => sum + p, 0);

    // Descuento de Club Lubrimax leído desde la sesión (no desde el body),
    // y solo si la membresía está activa y vigente.
    const customer = await getSessionCustomer();
    const membership = customer?.membership;
    const membershipValid =
      CLUB_ENABLED &&
      !!membership &&
      membership.isActive &&
      (!customer.membershipUntil || customer.membershipUntil > new Date());
    const discountPercent = membershipValid ? membership.discountPercent : 0;
    if (discountPercent > 0) {
      totalAmount = Math.round(totalAmount - totalAmount * (discountPercent / 100));
    }
    const amount = totalAmount;

    if (amount <= 0 && !FREE_MODE) {
      return NextResponse.json({ error: "Monto inválido para este servicio." }, { status: 400 });
    }

    const settings = await getSettings();
    const duration = totalDuration(services, selectedVariants);
    const endTimeStr = computeEndTime(startTime, duration, settings);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Validar la configuración de Webpay ANTES de bloquear el horario.
    const webpay = FREE_MODE ? null : getWebpayTransaction();

    // Verificación de disponibilidad + creación en una sola transacción, con
    // un lock por día: dos personas pagando el mismo horario a la vez ya no
    // pueden quedar ambas confirmadas. La regla es la misma que muestra el
    // wizard (horario de atención, anticipación mínima, bahías, fecha pasada).
    const booking = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${"booking:" + date}))`;

      const blocking = await getBlockingBookings(tx, date);
      const slots = computeAvailableSlots(date, duration, settings, blocking);
      if (!slots.includes(startTime)) throw new SlotTakenError();

      return tx.booking.create({
        data: {
          date: bookingDateFromDay(date),
          startTime,
          endTime: endTimeStr,
          customerName,
          // Teléfono y patente normalizados: así el CRM y la búsqueda por
          // patente en Ingreso los encuentran sin importar cómo se tipearon.
          customerPhone: formatPhone(customerPhone) || customerPhone,
          customerEmail: customerEmail ? customerEmail.toLowerCase() : null,
          vehicleMake: `${vehicleType} - ${make}`,
          vehicleModel: `${model} (Patente: ${normalizePlate(plate) || plate})`,
          services: { connect: uniqueServiceIds.map((id) => ({ id })) },
          selectedOptions: selectedVariants ?? undefined,
          totalPrice: totalAmount,
          ...(FREE_MODE
            ? {
                // Modo de prueba: confirma al toque, sin cobrar ni tocar
                // Webpay. Monto 0 para que se note en la agenda.
                status: "CONFIRMED",
                paymentStatus: "PAID_FULL",
                paymentId: "FREE_TEST",
                amount: 0,
              }
            : {
                // PENDING bloquea el horario mientras el cliente paga. Si el
                // pago se abandona, se libera solo pasados PENDING_HOLD_MINUTES.
                status: "PENDING",
                paymentStatus: "PENDING",
                amount,
              }),
          paymentType,
        },
        include: { services: { select: { name: true } } },
      });
    });
    bookingId = booking.id;

    if (FREE_MODE) {
      if (booking.customerEmail) {
        const [y, m, d] = booking.date.toISOString().substring(0, 10).split("-");
        const friendlyDate = `${d}/${m}/${y}`;

        const ownerEmail = process.env.OWNER_EMAIL || "contacto@lubrimax.cl";
        const adminEmailResult = await sendEmail({
          to: ownerEmail,
          subject: `NUEVA RESERVA (MODO PRUEBA) - ${booking.customerName} - ${friendlyDate} ${booking.startTime}`,
          html: (
            `<h1>Nueva Reserva (Modo Prueba)</h1>
             <p><strong>Cliente:</strong> ${escapeHtml(booking.customerName)} (${escapeHtml(booking.customerPhone)})</p>
             <p><strong>Vehículo:</strong> ${escapeHtml(booking.vehicleMake)} ${escapeHtml(booking.vehicleModel)}</p>
             <p><strong>Fecha y Hora:</strong> ${friendlyDate} de ${booking.startTime} a ${booking.endTime}</p>
             <p><strong>Servicios:</strong> ${escapeHtml(booking.services.map(s => s.name).join(' + '))}</p>
             <p><em>Esta reserva fue realizada en modo de prueba sin cobro.</em></p>
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
             <p><em>Reserva de prueba, sin costo.</em></p>
             <p>Te esperamos en Av. Gabriela Mistral 3061, La Serena.</p>`
          )
        });
        if (!emailResult.success) {
          console.error("No se pudo enviar el correo de confirmación (modo gratis)", booking.id, emailResult.error);
        }
      }

      return NextResponse.json({
        free: true,
        redirectUrl: `${baseUrl}/agendar?success=true&booking=${booking.id}`,
      });
    }

    const returnUrl = `${baseUrl}/api/webpay/booking/commit`;
    const createResponse = await webpay!.create(booking.id, booking.id, amount, returnUrl);

    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentId: createResponse.token }
    });

    return NextResponse.json({ token: createResponse.token, url: createResponse.url });
  } catch (error: unknown) {
    if (error instanceof SlotTakenError) {
      return NextResponse.json({ error: "El horario seleccionado ya no está disponible." }, { status: 409 });
    }

    console.error("Webpay Booking Create Error:", error);

    // No dejar el horario bloqueado si Transbank falló después de crear la reserva.
    if (bookingId) {
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } }).catch(() => {});
    }

    return NextResponse.json({ error: "Error al iniciar el pago con Transbank." }, { status: 500 });
  }
}

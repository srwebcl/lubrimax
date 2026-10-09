import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ON_SITE_PAYMENT, servicePriceFor } from "@/lib/booking-constants";
import { getSessionCustomer } from "@/actions/customer-auth";
import { getSettings } from "@/actions/admin-settings";
import { bookingPaymentSchema, flattenZodError } from "@/lib/validation";
import { checkRateLimit, getClientIpFromRequest } from "@/lib/rate-limit";
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
import { sendNewBookingEmails } from "@/lib/booking-emails";
import { CLUB_ENABLED } from "@/lib/features";

class SlotTakenError extends Error {}

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
    // Dos formas de reservar: "Reservar" (paga en el local) o "Reservar y
    // pagar" (100% por Webpay). No hay abono parcial.
    const payOnline = parsed.data.paymentType !== ON_SITE_PAYMENT;
    const paymentType = payOnline ? "FULL" : ON_SITE_PAYMENT;

    const uniqueServiceIds = [...new Set(serviceIds)];
    const services = await prisma.service.findMany({ where: { id: { in: uniqueServiceIds } } });
    if (services.length !== uniqueServiceIds.length) {
      return NextResponse.json({ error: "Alguno de los servicios no existe." }, { status: 404 });
    }

    // Precio calculado 100% en servidor: nunca confiar en el monto que
    // pudiera mandar el cliente. Un servicio sin precio para este tipo de
    // vehículo (ej. "a cotizar") no se puede reservar online: antes sumaba
    // $0 y abarataba el total.
    const prices = services.map((s) => servicePriceFor(s, vehicleType, selectedVariants?.[s.id]));
    if (prices.some((p) => p <= 0)) {
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

    if (amount <= 0) {
      return NextResponse.json({ error: "Monto inválido para este servicio." }, { status: 400 });
    }

    const settings = await getSettings();
    const duration = totalDuration(services, selectedVariants);
    const endTimeStr = computeEndTime(startTime, duration, settings);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // Validar la configuración de Webpay ANTES de bloquear el horario.
    const webpay = payOnline ? getWebpayTransaction() : null;

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
          paymentStatus: "PENDING",
          paymentType,
          ...(payOnline
            ? {
                // PENDING bloquea el horario mientras el cliente paga. Si el
                // pago se abandona, se libera solo pasados PENDING_HOLD_MINUTES.
                status: "PENDING",
                amount,
              }
            : {
                // Solo reservar: confirmada al tiro, nada cobrado todavía.
                status: "CONFIRMED",
                amount: 0,
              }),
        },
        include: { services: { select: { id: true, name: true } } },
      });
    });
    bookingId = booking.id;

    if (!webpay) {
      await sendNewBookingEmails(booking, { paid: false, amountDue: totalAmount });
      return NextResponse.json({
        reserved: true,
        redirectUrl: `${baseUrl}/agendar?success=true&booking=${booking.id}`,
      });
    }

    const returnUrl = `${baseUrl}/api/webpay/booking/commit`;
    const createResponse = await webpay.create(booking.id, booking.id, amount, returnUrl);

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

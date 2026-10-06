"use server";

import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

import { getSettings } from "./admin-settings";
import { computeAvailableSlots, getBlockingBookings, totalDuration } from "@/lib/availability";

async function fetchServices() {
  try {
    return await prisma.service.findMany({
      where: {
        priceAuto: {
          not: null
        }
      },
      orderBy: { priceAuto: 'asc' }
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

/**
 * Obtiene todos los servicios disponibles. Cacheada: la lista de servicios
 * se lee en cada carga del widget de reservas y casi no cambia; se invalida
 * al tiro en createService/updateService/deleteService.
 */
export const getServices = unstable_cache(fetchServices, ["services"], {
  tags: ["services"],
  revalidate: 300,
});

/**
 * Calcula los bloques horarios disponibles para una fecha ("YYYY-MM-DD") y
 * un conjunto de servicios. La misma regla se vuelve a aplicar al crear la
 * reserva (ver src/lib/availability.ts).
 */
export async function getAvailableSlots(
  dateString: string,
  serviceIds: string[],
  selectedVariants?: Record<string, string>
) {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString) || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return [];
    }

    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, duration: true, variants: true },
    });
    if (services.length === 0) return [];

    const [settings, bookings] = await Promise.all([
      getSettings(),
      getBlockingBookings(prisma, dateString),
    ]);

    return computeAvailableSlots(dateString, totalDuration(services, selectedVariants), settings, bookings);
  } catch (error) {
    console.error("Error calculating slots:", error);
    return [];
  }
}

// NOTA: la creación de reservas ya no vive aquí. El flujo real de pago
// (crear reserva PENDING + iniciar transacción Webpay + confirmar) está en
// src/app/api/webpay/booking/create y .../commit, porque requiere el
// callback HTTP de Transbank (no puede ser un Server Action). Ver esos
// archivos y src/lib/booking-constants.ts para el cálculo de precio.

/**
 * Trae los datos mínimos de una reserva para la pantalla de confirmación
 * post-pago (?booking=<id> en /agendar). No expone teléfono/email: el id
 * es difícil de adivinar (cuid) pero no hay razón para filtrar más PII de
 * la necesaria en una URL.
 */
export async function getBookingById(id: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { services: { select: { name: true } } }
    });

    if (!booking) return null;

    return {
      id: booking.id,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      serviceName: booking.services.map(s => s.name).join(" + "),
      vehicleMake: booking.vehicleMake,
      vehicleModel: booking.vehicleModel,
      amount: booking.amount,
      total: booking.totalPrice ?? booking.amount,
      // Pagó online (Webpay) o solo reservó y paga en el local.
      paid: booking.paymentStatus === "PAID_FULL" || booking.paymentStatus === "PAID_RESERVATION",
    };
  } catch (error) {
    console.error("Error fetching booking:", error);
    return null;
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { addMinutes, format, isBefore, isAfter, isEqual } from "date-fns";
import { unstable_cache } from "next/cache";

import { getSettings } from "./admin-settings";
import { PENDING_HOLD_MINUTES } from "@/lib/booking-constants";

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
 * Calcula los bloques horarios disponibles para una fecha y servicio específico
 */
export async function getAvailableSlots(dateString: string, serviceIds: string[]) {
  try {
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } }
    });

    if (services.length === 0) throw new Error("Servicios no encontrados");
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

    // Fecha consultada (asumimos formato YYYY-MM-DD)
    const [year, month, day] = dateString.split("-").map(Number);
    
    const queryStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const queryEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    // Obtener horarios de la BD
    const settings = await getSettings();
    const WORK_START_HOUR = settings.workStartHour;
    const WORK_END_HOUR = settings.workEndHour;
    const CONCURRENT_BAYS = settings.concurrentBays || 1;
    const SLOT_INTERVAL = settings.slotInterval || 30;

    // Obtener todas las reservas existentes para ese día. Las CONFIRMED (ya
    // pagadas) siempre bloquean el horario; las PENDING (esperando el
    // retorno de Webpay) lo bloquean solo mientras están "frescas" — pasado
    // PENDING_HOLD_MINUTES se asumen abandonadas y el slot se libera solo,
    // sin necesidad de un job de limpieza aparte.
    const pendingCutoff = new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000);
    const existingBookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: queryStart,
          lte: queryEnd
        },
        OR: [
          { status: "CONFIRMED" },
          { status: "PENDING", createdAt: { gte: pendingCutoff } }
        ]
      }
    });

    // Generar todos los slots posibles
    const availableSlots: string[] = [];
    
    let currentSlotTime = new Date(year, month - 1, day, WORK_START_HOUR, 0, 0, 0);
    const endOfDayTime = new Date(year, month - 1, day, WORK_END_HOUR, 0, 0, 0);
    const now = new Date(); // Para descartar horas pasadas de hoy

    while (isBefore(currentSlotTime, endOfDayTime)) {
      // Calcular a qué hora terminaría el servicio si empieza en este slot
      const slotEndTime = addMinutes(currentSlotTime, totalDuration);

      // Regla 1: El servicio NO puede terminar después del horario de cierre
      if (isAfter(slotEndTime, endOfDayTime)) {
        break; // Si este no entra, los siguientes tampoco
      }

      // Regla 2: Descartar horarios que no cumplen con la anticipación mínima
      const advanceLimit = addMinutes(now, (settings.advanceBookingHours || 12) * 60);
      
      if (isBefore(currentSlotTime, advanceLimit)) {
        currentSlotTime = addMinutes(currentSlotTime, SLOT_INTERVAL);
        continue;
      }

      // Regla 3: Revisar colisiones con reservas existentes
      let overlappingCount = 0;
      
      for (const booking of existingBookings) {
        const [bHour, bMin] = booking.startTime.split(":").map(Number);
        const [eHour, eMin] = booking.endTime.split(":").map(Number);
        
        const bookingStart = new Date(year, month - 1, day, bHour, bMin, 0, 0);
        const bookingEnd = new Date(year, month - 1, day, eHour, eMin, 0, 0);

        if (
          (isBefore(currentSlotTime, bookingEnd) || isEqual(currentSlotTime, bookingEnd)) &&
          (isAfter(slotEndTime, bookingStart) || isEqual(slotEndTime, bookingStart)) &&
          !isEqual(currentSlotTime, bookingEnd) && 
          !isEqual(slotEndTime, bookingStart)
        ) {
          overlappingCount++;
        }
      }

      if (overlappingCount < CONCURRENT_BAYS) {
        availableSlots.push(format(currentSlotTime, 'HH:mm'));
      }

      // Avanzar al siguiente bloque
      currentSlotTime = addMinutes(currentSlotTime, SLOT_INTERVAL);
    }

    return availableSlots;

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
    };
  } catch (error) {
    console.error("Error fetching booking:", error);
    return null;
  }
}

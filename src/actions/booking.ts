"use server";

import { prisma } from "@/lib/prisma";
import { addMinutes, parse, format, isBefore, isAfter, isEqual } from "date-fns";

const WORK_START_HOUR = 9; // 09:00 AM
const WORK_END_HOUR = 18; // 18:00 PM (6 PM)

/**
 * Obtiene todos los servicios disponibles
 */
export async function getServices() {
  try {
    return await prisma.service.findMany({
      orderBy: { priceAuto: 'asc' }
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return [];
  }
}

/**
 * Calcula los bloques horarios disponibles para una fecha y servicio específico
 */
export async function getAvailableSlots(dateString: string, serviceId: string) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) throw new Error("Servicio no encontrado");

    // Fecha consultada (asumimos formato YYYY-MM-DD)
    const queryDate = new Date(dateString);
    
    // Obtener todas las reservas existentes para ese día
    const existingBookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: new Date(queryDate.setHours(0, 0, 0, 0)),
          lte: new Date(queryDate.setHours(23, 59, 59, 999))
        },
        status: {
          not: "CANCELLED"
        }
      }
    });

    // Generar todos los slots posibles cada 30 minutos
    const availableSlots: string[] = [];
    const baseDate = new Date(dateString);
    
    let currentSlotTime = new Date(baseDate.setHours(WORK_START_HOUR, 0, 0, 0));
    const endOfDayTime = new Date(baseDate.setHours(WORK_END_HOUR, 0, 0, 0));

    while (isBefore(currentSlotTime, endOfDayTime)) {
      // Calcular a qué hora terminaría el servicio si empieza en este slot
      const slotEndTime = addMinutes(currentSlotTime, service.duration);

      // Regla 1: El servicio NO puede terminar después del horario de cierre (18:00)
      if (isAfter(slotEndTime, endOfDayTime)) {
        break; // Como generamos cronológicamente, si este no entra, los siguientes tampoco
      }

      // Regla 2: Revisar colisiones con reservas existentes
      let hasCollision = false;
      
      for (const booking of existingBookings) {
        const bookingStart = parse(booking.startTime, 'HH:mm', baseDate);
        const bookingEnd = parse(booking.endTime, 'HH:mm', baseDate);

        // Hay colisión si el nuevo slot empieza ANTES de que termine una reserva existente
        // Y termina DESPUÉS de que empiece esa reserva existente
        if (
          (isBefore(currentSlotTime, bookingEnd) || isEqual(currentSlotTime, bookingEnd)) &&
          (isAfter(slotEndTime, bookingStart) || isEqual(slotEndTime, bookingStart)) &&
          !isEqual(currentSlotTime, bookingEnd) && 
          !isEqual(slotEndTime, bookingStart)
        ) {
          hasCollision = true;
          break;
        }
      }

      if (!hasCollision) {
        availableSlots.push(format(currentSlotTime, 'HH:mm'));
      }

      // Avanzar al siguiente bloque de 30 minutos para evaluación
      currentSlotTime = addMinutes(currentSlotTime, 30);
    }

    return availableSlots;

  } catch (error) {
    console.error("Error calculating slots:", error);
    return [];
  }
}

/**
 * Crea una nueva reserva
 */
export async function createBooking(data: {
  date: string;
  startTime: string;
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleMake: string;
  vehicleModel: string;
  paymentStatus?: string;
}) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId }
    });

    if (!service) throw new Error("Servicio no encontrado");

    // Verificar disponibilidad nuevamente antes de insertar (Evitar double booking)
    const availableSlots = await getAvailableSlots(data.date, data.serviceId);
    if (!availableSlots.includes(data.startTime)) {
      throw new Error("El horario seleccionado ya no está disponible.");
    }

    const baseDate = new Date(data.date);
    const start = parse(data.startTime, 'HH:mm', baseDate);
    const end = addMinutes(start, service.duration);
    const endTimeStr = format(end, 'HH:mm');

    const booking = await prisma.booking.create({
      data: {
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: endTimeStr,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        serviceId: data.serviceId,
        status: "CONFIRMED",
        paymentStatus: data.paymentStatus || "PENDING"
      }
    });

    // TODO: Disparar email con Resend aquí

    return { success: true, booking };
  } catch (error: unknown) {
    console.error("Error creating booking:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { addMinutes, parse, format, isBefore, isAfter, isEqual } from "date-fns";

import { getSettings } from "./admin-settings";
import { sendEmail } from "@/lib/email";

/**
 * Obtiene todos los servicios disponibles
 */
export async function getServices() {
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
 * Calcula los bloques horarios disponibles para una fecha y servicio específico
 */
export async function getAvailableSlots(dateString: string, serviceId: string) {
  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!service) throw new Error("Servicio no encontrado");

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

    // Obtener todas las reservas existentes para ese día
    const existingBookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: queryStart,
          lte: queryEnd
        },
        status: {
          not: "CANCELLED"
        }
      }
    });

    // Generar todos los slots posibles
    const availableSlots: string[] = [];
    
    let currentSlotTime = new Date(year, month - 1, day, WORK_START_HOUR, 0, 0, 0);
    const endOfDayTime = new Date(year, month - 1, day, WORK_END_HOUR, 0, 0, 0);
    const now = new Date(); // Para descartar horas pasadas de hoy

    while (isBefore(currentSlotTime, endOfDayTime)) {
      // Calcular a qué hora terminaría el servicio si empieza en este slot
      const slotEndTime = addMinutes(currentSlotTime, service.duration);

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

    const [year, month, day] = data.date.split("-").map(Number);
    const [sHour, sMin] = data.startTime.split(":").map(Number);
    const localDate = new Date(year, month - 1, day);
    const start = new Date(year, month - 1, day, sHour, sMin, 0, 0);
    const end = addMinutes(start, service.duration);
    const endTimeStr = format(end, 'HH:mm');

    const booking = await prisma.booking.create({
      data: {
        date: new Date(data.date), // UTC para la base de datos
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

    if (data.customerEmail) {
      const friendlyDate = format(localDate, "dd/MM/yyyy");
      await sendEmail({
        to: data.customerEmail,
        subject: `Confirmación de tu hora en LUBRIMAX - ${friendlyDate}`,
        react: (
          `<h1>¡Hola ${data.customerName}!</h1>
           <p>Tu reserva para <strong>${service.name}</strong> quedó confirmada.</p>
           <p>Fecha: ${friendlyDate}<br/>Hora: ${data.startTime} - ${endTimeStr}</p>
           <p>Vehículo: ${data.vehicleMake} ${data.vehicleModel}</p>
           <p>Te esperamos en Av. Gabriela Mistral 3061, La Serena.</p>`
        ) as any // Cast temporal para evitar error tipográfico si no usamos @react-email yet
      });
    }

    return { success: true, booking };
  } catch (error: unknown) {
    console.error("Error creating booking:", error);
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}

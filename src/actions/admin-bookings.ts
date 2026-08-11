"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";

import { addMinutes, format } from "date-fns";

/**
 * Actualiza el estado, pago y fecha/hora de una reserva desde el panel de administración
 */
export async function updateBookingStatus(id: string, formData: FormData) {
  try {
    await requireAdmin();

    const status = formData.get("status") as string;
    const paymentStatus = formData.get("paymentStatus") as string;
    const newDate = formData.get("newDate") as string;
    const newTime = formData.get("newTime") as string;

    if (!status || !paymentStatus) {
      return { success: false, error: "Datos incompletos." };
    }

    const currentBooking = await prisma.booking.findUnique({
      where: { id },
      include: { services: true }
    });

    if (!currentBooking) {
      return { success: false, error: "Reserva no encontrada." };
    }

    const updateData: any = {
      status,
      paymentStatus
    };

    // Si se envió una nueva fecha u hora, recalculamos el reagendamiento
    if (newDate && newTime) {
      const [year, month, day] = newDate.split("-").map(Number);
      const [sHour, sMin] = newTime.split(":").map(Number);
      
      const start = new Date(year, month - 1, day, sHour, sMin, 0, 0);
      const end = addMinutes(start, currentBooking.services.reduce((acc, s) => acc + s.duration, 0));
      const endTimeStr = format(end, 'HH:mm');

      updateData.date = new Date(newDate); // UTC format para Prisma
      updateData.startTime = newTime;
      updateData.endTime = endTimeStr;
    }

    await prisma.booking.update({
      where: { id },
      data: updateData
    });

    // Invalidar cache de las páginas afectadas
    revalidatePath("/admin");
    revalidatePath("/agendar");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating booking:", error);
    return { success: false, error: "Error al actualizar la reserva." };
  }
}

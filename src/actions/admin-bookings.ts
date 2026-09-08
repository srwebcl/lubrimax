"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole, requireStaff } from "@/lib/staff-session";

import { addMinutes, format } from "date-fns";

// Estados operativos válidos que puede marcar el personal desde la agenda.
// Deben coincidir con lo que espera la UI (BookingsManager).
export const WORK_STATUSES = ["PENDING", "IN_PROGRESS", "DONE"] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

/**
 * Actualiza estado comercial, pago y fecha/hora de una reserva.
 * SOLO ADMIN: implica reagendar y tocar el estado de pago.
 */
export async function updateBookingStatus(id: string, formData: FormData) {
  try {
    const session = await requireRole("ADMIN");

    const status = formData.get("status") as string;
    const paymentStatus = formData.get("paymentStatus") as string;
    const newDate = formData.get("newDate") as string;
    const newTime = formData.get("newTime") as string;

    if (!status || !paymentStatus) {
      return { success: false, error: "Datos incompletos." };
    }

    const currentBooking = await prisma.booking.findUnique({
      where: { id },
      include: { services: true },
    });

    if (!currentBooking) {
      return { success: false, error: "Reserva no encontrada." };
    }

    const updateData: {
      status: string;
      paymentStatus: string;
      date?: Date;
      startTime?: string;
      endTime?: string;
    } = { status, paymentStatus };

    let rescheduled = false;
    // Si se envió una nueva fecha u hora, recalculamos el reagendamiento
    if (newDate && newTime) {
      const [year, month, day] = newDate.split("-").map(Number);
      const [sHour, sMin] = newTime.split(":").map(Number);

      const start = new Date(year, month - 1, day, sHour, sMin, 0, 0);
      const end = addMinutes(
        start,
        currentBooking.services.reduce((acc, s) => acc + s.duration, 0)
      );

      updateData.date = new Date(newDate);
      updateData.startTime = newTime;
      updateData.endTime = format(end, "HH:mm");
      rescheduled =
        newDate !== format(currentBooking.date, "yyyy-MM-dd") ||
        newTime !== currentBooking.startTime;
    }

    await prisma.booking.update({ where: { id }, data: updateData });

    const changes: string[] = [];
    if (currentBooking.status !== status)
      changes.push(`estado ${currentBooking.status}->${status}`);
    if (currentBooking.paymentStatus !== paymentStatus)
      changes.push(`pago ${currentBooking.paymentStatus}->${paymentStatus}`);
    if (rescheduled) changes.push(`reagendada a ${newDate} ${newTime}`);
    if (changes.length > 0) {
      await logBookingActivity(id, session, "STATUS", changes.join("; "));
    }

    revalidatePath("/admin");
    revalidatePath("/agendar");

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") {
      return { success: false, error: "No autorizado." };
    }
    console.error("Error updating booking:", error);
    return { success: false, error: "Error al actualizar la reserva." };
  }
}

/**
 * Marca el avance físico del trabajo (PENDING / IN_PROGRESS / DONE).
 * Cualquier miembro del personal con sesión (admin o trabajador).
 * NO toca `status`, `paymentStatus` ni la fecha.
 */
export async function updateWorkStatus(id: string, workStatus: string) {
  try {
    const session = await requireStaff();

    if (!WORK_STATUSES.includes(workStatus as WorkStatus)) {
      return { success: false, error: "Estado de trabajo inválido." };
    }

    const current = await prisma.booking.findUnique({
      where: { id },
      select: { workStatus: true },
    });
    if (!current) return { success: false, error: "Reserva no encontrada." };

    if (current.workStatus !== workStatus) {
      await prisma.booking.update({ where: { id }, data: { workStatus } });
      await logBookingActivity(
        id,
        session,
        "WORK_STATUS",
        `${current.workStatus} -> ${workStatus}`
      );
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") {
      return { success: false, error: "No autorizado." };
    }
    console.error("Error updating work status:", error);
    return { success: false, error: "Error al actualizar el trabajo." };
  }
}

async function logBookingActivity(
  bookingId: string,
  session: { userId: string; name: string },
  action: string,
  detail: string
) {
  try {
    await prisma.bookingActivityLog.create({
      data: {
        bookingId,
        staffUserId: session.userId,
        staffName: session.name,
        action,
        detail,
      },
    });
  } catch (error) {
    // La bitácora no debe romper la operación principal.
    console.error("No se pudo registrar la actividad de la reserva:", error);
  }
}

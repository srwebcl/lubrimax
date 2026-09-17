"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole, requireStaff } from "@/lib/staff-session";
import { sendEmail } from "@/lib/email";

import { addMinutes, format } from "date-fns";

// Estados operativos válidos que puede marcar el personal desde la agenda.
// Deben coincidir con lo que espera la UI (BookingsManager).
const WORK_STATUSES = ["PENDING", "IN_PROGRESS", "DONE"] as const;
type WorkStatus = (typeof WORK_STATUSES)[number];

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
      const dbDate = currentBooking.date.toISOString().substring(0, 10);
      rescheduled = newDate !== dbDate || newTime !== currentBooking.startTime;

      if (rescheduled) {
        const [year, month, day] = newDate.split("-").map(Number);
        const [sHour, sMin] = newTime.split(":").map(Number);

        const start = new Date(year, month - 1, day, sHour, sMin, 0, 0);
        const end = addMinutes(
          start,
          currentBooking.services.reduce((acc, s) => acc + s.duration, 0)
        );

        updateData.date = new Date(`${newDate}T00:00:00.000Z`);
        updateData.startTime = newTime;
        updateData.endTime = format(end, "HH:mm");
      }
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
      
      // Enviar correo al cliente
      if (currentBooking.customerEmail) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.lubrimax.cl";
        const dateStr = updateData.date ? format(updateData.date, "dd/MM/yyyy") : format(currentBooking.date, "dd/MM/yyyy");
        const timeStr = updateData.startTime || currentBooking.startTime;
        
        let statusText = "actualizada";
        if (status === "CONFIRMED") statusText = "confirmada";
        if (status === "CANCELLED") statusText = "cancelada";

        const subject = status === "CANCELLED" 
          ? `Reserva Cancelada - LUBRIMAX`
          : `Actualización de Reserva - LUBRIMAX`;

        await sendEmail({
          to: currentBooking.customerEmail,
          subject,
          html: (
            `<h1>Hola ${currentBooking.customerName}</h1>
             <p>Te informamos que tu reserva para el vehículo <strong>${currentBooking.vehicleMake} ${currentBooking.vehicleModel}</strong> ha sido <strong>${statusText}</strong>.</p>
             ${status !== "CANCELLED" ? `<p>Tu cita quedó para el <strong>${dateStr}</strong> a las <strong>${timeStr}</strong> hrs.</p>` : ''}
             ${rescheduled ? `<p><em>Nota: El horario de tu reserva fue reprogramado por la administración.</em></p>` : ''}
             <p>Cualquier duda, puedes contactarnos respondiendo a este correo.</p>
             <p>Saludos,<br>El equipo de LUBRIMAX</p>`
          )
        });
      }
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

      // Si el trabajo acaba de terminar, notificar al cliente para que retire el auto
      if (workStatus === "DONE") {
        const bookingInfo = await prisma.booking.findUnique({
          where: { id },
          select: { customerEmail: true, customerName: true, vehicleMake: true, vehicleModel: true }
        });
        
        if (bookingInfo?.customerEmail) {
          await sendEmail({
            to: bookingInfo.customerEmail,
            subject: `¡Tu vehículo está listo! - LUBRIMAX`,
            html: (
              `<h1>Hola ${bookingInfo.customerName}</h1>
               <p>Te informamos que los servicios en tu vehículo <strong>${bookingInfo.vehicleMake} ${bookingInfo.vehicleModel}</strong> han sido <strong>terminados</strong> exitosamente.</p>
               <p>Ya puedes pasar a retirar tu auto por nuestras instalaciones en Av. Gabriela Mistral 3061.</p>
               <p>¡Te esperamos!</p>
               <p>Saludos,<br>El equipo de LUBRIMAX</p>`
            )
          });
        }
      }
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

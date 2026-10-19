"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole, requirePermission } from "@/lib/staff-session";
import { sendEmail, escapeHtml } from "@/lib/email";
import { bookingMoney } from "@/lib/booking-money";
import { bookingServiceNames } from "@/lib/booking-services";
import { buildVehicleReadyCustomerHtml, renderEmailBase } from "@/lib/email-templates";
import { OFFICIAL_SITE_URL } from "@/lib/site-url";

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
        const baseUrl = OFFICIAL_SITE_URL;
        const dateStr = updateData.date ? format(updateData.date, "dd/MM/yyyy") : format(currentBooking.date, "dd/MM/yyyy");
        const timeStr = updateData.startTime || currentBooking.startTime;
        
        let statusText = "actualizada";
        if (status === "CONFIRMED") statusText = "confirmada";
        if (status === "CANCELLED") statusText = "cancelada";

        const subject = status === "CANCELLED" 
          ? `Reserva Cancelada - LUBRIMAX`
          : `Actualización de Reserva - LUBRIMAX`;

        const updateBody = `
          <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">
            ¡Hola, ${escapeHtml(currentBooking.customerName)}!
          </h2>
          <p style="margin:0 0 16px 0;font-size:14px;color:#cbd5e1;line-height:1.6;">
            Te informamos que tu reserva para el vehículo <strong style="color:#ffffff;">${escapeHtml(currentBooking.vehicleMake)} ${escapeHtml(currentBooking.vehicleModel)}</strong> ha sido <strong style="color:${status === "CANCELLED" ? "#f87171" : "#38bdf8"};">${statusText}</strong>.
          </p>
          ${status !== "CANCELLED" ? `
            <div style="margin:16px 0;padding:16px 20px;background-color:#141c2e;border:1px solid #27354f;border-radius:12px;">
              <div style="font-size:13px;color:#94a3b8;margin-bottom:4px;">Tu cita quedó programada para:</div>
              <div style="font-size:16px;font-weight:700;color:#38bdf8;">${dateStr} a las ${timeStr} hrs</div>
              ${rescheduled ? `<div style="font-size:12px;color:#fbbf24;margin-top:6px;">⚠️ Nota: El horario fue reprogramado por la administración.</div>` : ""}
            </div>
          ` : `
            <div style="margin:16px 0;padding:14px 18px;background-color:rgba(239,68,68,0.1);border:1px solid #ef4444;border-radius:10px;font-size:13px;color:#fca5a5;">
              Tu reserva ha sido cancelada en el sistema. Si requieres agendar una nueva fecha, puedes hacerlo directamente en nuestro sitio web o contactándonos.
            </div>
          `}
          <div style="margin-top:24px;padding-top:18px;border-top:1px solid #1e293b;">
            <p style="margin:0 0 8px 0;font-size:13px;color:#94a3b8;">
              Si tienes cualquier duda o consulta, puedes comunicarte con nosotros respondiendo directamente a este correo o vía WhatsApp.
            </p>
            <p style="margin:14px 0 2px 0;font-size:14px;font-weight:700;color:#38bdf8;">
              Te esperamos. Equipo de Lubrimax
            </p>
            <div style="font-size:12px;color:#64748b;">Clínica de Estética Automotriz</div>
          </div>
        `;

        await sendEmail({
          to: currentBooking.customerEmail,
          subject,
          html: renderEmailBase({
            title: subject,
            badgeText: status === "CANCELLED" ? "Reserva Cancelada" : "Actualización de Cita",
            badgeColor: status === "CANCELLED" ? "amber" : "cyan",
            contentHtml: updateBody,
          }),
        });
      }
    }

    revalidatePath("/admin", "layout");
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
    const session = await requirePermission("work");

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
          select: {
            customerEmail: true,
            customerName: true,
            vehicleMake: true,
            vehicleModel: true,
            services: { select: { id: true, name: true } },
            selectedOptions: true,
            totalPrice: true,
            amount: true,
            paymentType: true,
            paymentStatus: true,
            payments: { select: { amount: true, method: true } },
            intakes: {
              select: { vehicle: { select: { plate: true } } },
              take: 1,
            },
          },
        });
        
        if (bookingInfo?.customerEmail) {
          const money = bookingMoney(bookingInfo);
          const servicesList = bookingServiceNames({
            services: bookingInfo.services,
            selectedOptions: bookingInfo.selectedOptions ?? null,
          }).join(" · ");
          const plate = bookingInfo.intakes[0]?.vehicle?.plate || null;

          await sendEmail({
            to: bookingInfo.customerEmail,
            subject: `🚗 ¡Tu vehículo está listo para retirar! - LUBRIMAX`,
            html: buildVehicleReadyCustomerHtml({
              customerName: bookingInfo.customerName,
              vehicleMake: bookingInfo.vehicleMake,
              vehicleModel: bookingInfo.vehicleModel,
              plate,
              services: servicesList,
              balance: money.balance,
            }),
          });
        }
      }
    }

    revalidatePath("/admin", "layout");
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

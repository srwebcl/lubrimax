"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff-session";

export type NewBookingNotice = {
  id: string;
  customerName: string;
  date: string; // "YYYY-MM-DD"
  startTime: string;
  /** true = pagó online (Webpay); false = solo reservó, paga en el local. */
  paid: boolean;
  /** Monto pagado (si paid) o por cobrar en el local. */
  amount: number;
};

/**
 * Reservas WEB confirmadas (pagadas online o solo reservadas) creadas en las
 * últimas `windowMinutes`. El cliente guarda los ids que ya avisó y solo
 * notifica los nuevos. Se excluyen los pagos pendientes/abandonados y los
 * ingresos manuales del taller (esos no tienen `paymentType`).
 */
export async function getRecentPaidBookings(windowMinutes = 60): Promise<NewBookingNotice[]> {
  await requireStaff();

  const minutes = Math.min(Math.max(Math.trunc(windowMinutes) || 60, 1), 24 * 60);
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      paymentType: { not: null },
      createdAt: { gte: new Date(Date.now() - minutes * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      customerName: true,
      date: true,
      startTime: true,
      paymentStatus: true,
      amount: true,
      totalPrice: true,
    },
  });

  return bookings.map((b) => ({
    id: b.id,
    customerName: b.customerName,
    date: b.date.toISOString().substring(0, 10),
    startTime: b.startTime,
    paid: b.paymentStatus === "PAID_FULL" || b.paymentStatus === "PAID_RESERVATION",
    amount:
      b.paymentStatus === "PAID_FULL" || b.paymentStatus === "PAID_RESERVATION"
        ? b.amount ?? 0
        : b.totalPrice ?? 0,
  }));
}

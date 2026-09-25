"use server";

// Tablero del Taller: punto único donde se gestionan todos los vehículos del
// día, lleguen con reserva web o directo al local. Cada vehículo es una
// reserva (el ingreso sin reserva crea una, ver actions/intake.ts) más su
// ingreso físico (VehicleIntake). El estado visible se deriva de ambos:
//
//   Por llegar  → reserva de hoy sin ingreso
//   En espera   → ingresado, workStatus PENDING
//   En proceso  → workStatus IN_PROGRESS
//   Listo       → workStatus DONE, aún en el local
//   Entregado   → ingreso DELIVERED
//
// Iniciar/Terminar usan updateWorkStatus (admin-bookings.ts: bitácora +
// correo "tu auto está listo"). Entregar y No se presentó viven acá.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/staff-session";
import { getSettings } from "./admin-settings";
import { chileNow, chileTodayRange } from "@/lib/chile-time";
import { computeAvailableSlots, getBlockingBookings } from "@/lib/availability";
import { bookingMoney, paymentStatusFor, LOCAL_PAYMENT_METHODS } from "@/lib/booking-money";
import { parseBookingVehicle } from "@/lib/plate";
import { flattenZodError } from "@/lib/validation";

/** Minutos de tolerancia antes de marcar una reserva como atrasada. */
const LATE_AFTER_MINUTES = 30;

export type BoardStage = "ARRIVING" | "WAITING" | "IN_PROGRESS" | "READY" | "DELIVERED";

export type BoardCard = {
  key: string;
  bookingId: string | null;
  intakeId: string | null;
  stage: BoardStage;
  source: "WEB" | "LOCAL";
  startTime: string | null;
  late: boolean;
  plate: string;
  vehicle: string;
  customerName: string;
  customerPhone: string | null;
  services: string[];
  photoUrl: string | null;
  notes: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
  money: { total: number; paid: number; balance: number } | null;
};

export type BoardData = {
  cards: BoardCard[];
  capacity: { bays: number; inProgress: number; waiting: number; nextFreeSlot: string | null };
  today: string;
};

function fail(error: string) {
  return { success: false as const, error };
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const bookingInclude = {
  services: { select: { name: true } },
  payments: { select: { amount: true, method: true } },
} as const;

type BoardBooking = {
  id: string;
  startTime: string;
  workStatus: string;
  customerName: string;
  customerPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  selectedOptions: unknown;
  paymentType: string | null;
  paymentStatus: string;
  amount: number | null;
  totalPrice: number | null;
  services: { name: string }[];
  payments: { amount: number; method: string }[];
};

function serviceNames(b: BoardBooking) {
  const names = b.services.map((s) => s.name);
  const custom = (b.selectedOptions as { customService?: { detail?: string } } | null)?.customService?.detail;
  if (custom) names.push(`[Personalizado] ${custom}`);
  return names;
}

export async function getBoard(): Promise<BoardData> {
  await requireStaff();

  const now = chileNow();
  const { start, end } = chileTodayRange();

  const [todayBookings, inShop, deliveredRecent, settings, blocking] = await Promise.all([
    // Reservas confirmadas de hoy (web y locales).
    prisma.booking.findMany({
      where: { date: { gte: start, lt: end }, status: "CONFIRMED" },
      include: { ...bookingInclude, intakes: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { startTime: "asc" },
    }),
    // Vehículos que siguen en el local (incluye los de días anteriores).
    prisma.vehicleIntake.findMany({
      where: { status: "IN_SHOP" },
      include: { vehicle: { include: { client: true } }, booking: { include: bookingInclude } },
      orderBy: { createdAt: "asc" },
    }),
    // Entregados en las últimas ~28 h; se filtran a "hoy en Chile" abajo.
    prisma.vehicleIntake.findMany({
      where: { status: "DELIVERED", deliveredAt: { gte: new Date(Date.now() - 28 * 60 * 60 * 1000) } },
      include: { vehicle: { include: { client: true } }, booking: { include: bookingInclude } },
      orderBy: { deliveredAt: "desc" },
    }),
    getSettings(),
    getBlockingBookings(prisma, now.date),
  ]);

  const cards: BoardCard[] = [];
  const seenBookings = new Set<string>();

  function intakeCard(
    intake: (typeof inShop)[number],
    stage: BoardStage
  ): BoardCard {
    const b = intake.booking as BoardBooking | null;
    return {
      key: `intake-${intake.id}`,
      bookingId: b?.id ?? null,
      intakeId: intake.id,
      stage,
      source: b?.paymentType ? "WEB" : "LOCAL",
      startTime: b?.startTime ?? null,
      late: false,
      plate: intake.vehicle.plate,
      vehicle: `${intake.vehicle.make} ${intake.vehicle.model}`,
      customerName: intake.vehicle.client.name,
      customerPhone: intake.vehicle.client.phone,
      services: b ? serviceNames(b) : [],
      photoUrl: intake.photoUrl,
      notes: intake.notes,
      arrivedAt: intake.createdAt.toISOString(),
      deliveredAt: intake.deliveredAt?.toISOString() ?? null,
      money: b ? bookingMoney(b) : null,
    };
  }

  // 1. En el local
  for (const intake of inShop) {
    const ws = intake.booking?.workStatus;
    // Ingresos antiguos sin reserva: solo se pueden entregar.
    const stage: BoardStage = !intake.booking
      ? "IN_PROGRESS"
      : ws === "DONE"
        ? "READY"
        : ws === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : "WAITING";
    cards.push(intakeCard(intake, stage));
    if (intake.bookingId) seenBookings.add(intake.bookingId);
  }

  // 2. Entregados hoy
  for (const intake of deliveredRecent) {
    if (!intake.deliveredAt || chileNow(intake.deliveredAt).date !== now.date) continue;
    if (intake.bookingId && seenBookings.has(intake.bookingId)) continue;
    cards.push(intakeCard(intake, "DELIVERED"));
    if (intake.bookingId) seenBookings.add(intake.bookingId);
  }

  // 3. Reservas de hoy que aún no llegan
  const nowMinutes = toMinutes(now.time);
  for (const b of todayBookings) {
    if (seenBookings.has(b.id) || b.intakes.length > 0 || b.workStatus === "DONE") continue;
    const v = parseBookingVehicle(b.vehicleMake, b.vehicleModel);
    cards.push({
      key: `booking-${b.id}`,
      bookingId: b.id,
      intakeId: null,
      stage: "ARRIVING",
      source: b.paymentType ? "WEB" : "LOCAL",
      startTime: b.startTime,
      late: nowMinutes > toMinutes(b.startTime) + LATE_AFTER_MINUTES,
      plate: v.plate,
      vehicle: `${v.make} ${v.model}`.trim(),
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      services: serviceNames(b),
      photoUrl: null,
      notes: null,
      arrivedAt: null,
      deliveredAt: null,
      money: bookingMoney(b),
    });
  }

  // Capacidad: bahías en uso y próximo hueco libre desde ahora (sin la
  // anticipación mínima de la web: el cliente ya está en el local).
  const nextFreeSlot =
    computeAvailableSlots(now.date, 60, settings, blocking, now, { advanceMinutes: 0 })[0] ?? null;

  return {
    cards,
    capacity: {
      bays: settings.concurrentBays || 1,
      inProgress: cards.filter((c) => c.stage === "IN_PROGRESS").length,
      waiting: cards.filter((c) => c.stage === "WAITING").length,
      nextFreeSlot,
    },
    today: now.date,
  };
}

/** Reserva que no llegó: libera el cupo. Solo si aún no tiene ingreso. */
export async function markNoShow(bookingId: string) {
  try {
    const session = await requireStaff();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, _count: { select: { intakes: true } } },
    });
    if (!booking) return fail("Reserva no encontrada.");
    if (booking._count.intakes > 0) return fail("Este vehículo ya fue ingresado al taller.");
    if (booking.status !== "CONFIRMED") return fail("La reserva ya no está activa.");

    await prisma.$transaction([
      prisma.booking.update({ where: { id: bookingId }, data: { status: "NO_SHOW" } }),
      prisma.bookingActivityLog.create({
        data: { bookingId, staffUserId: session.userId, staffName: session.name, action: "NO_SHOW", detail: "CONFIRMED -> NO_SHOW" },
      }),
    ]);

    revalidatePath("/admin", "layout");
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("markNoShow:", error);
    return fail("No se pudo marcar la inasistencia.");
  }
}

const deliverSchema = z.object({
  intakeId: z.string().min(1).max(40),
  payment: z
    .object({
      amount: z.number().int().positive("El monto debe ser mayor a 0.").max(20_000_000),
      method: z.enum(LOCAL_PAYMENT_METHODS, { error: "Medio de pago inválido." }),
    })
    .optional(),
});

/**
 * Entrega el vehículo (sale del local) y, opcionalmente, registra el cobro
 * del saldo. Deja el trabajo como terminado y el estado de pago al día.
 */
export async function deliverVehicle(input: unknown) {
  try {
    const session = await requireStaff();

    const parsed = deliverSchema.safeParse(input);
    if (!parsed.success) return fail(flattenZodError(parsed.error));
    const { intakeId, payment } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const intake = await tx.vehicleIntake.findUnique({
        where: { id: intakeId },
        include: { booking: { include: { payments: { select: { amount: true, method: true } } } } },
      });
      if (!intake) return fail("Ingreso no encontrado.");
      if (intake.status !== "IN_SHOP") return fail("Este vehículo ya fue entregado.");

      const booking = intake.booking;
      if (payment && !booking) return fail("Este ingreso no tiene una reserva asociada para registrar el cobro.");

      if (booking) {
        const money = bookingMoney(booking);
        if (payment && payment.amount > money.balance) {
          return fail(`El cobro supera el saldo pendiente ($${money.balance.toLocaleString("es-CL")}).`);
        }
        const paid = money.paid + (payment?.amount ?? 0);

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            workStatus: "DONE",
            paymentStatus: paymentStatusFor(money.total, paid),
            ...(payment
              ? {
                  payments: {
                    create: {
                      amount: payment.amount,
                      method: payment.method,
                      staffUserId: session.userId,
                      staffName: session.name,
                    },
                  },
                }
              : {}),
          },
        });

        await tx.bookingActivityLog.create({
          data: {
            bookingId: booking.id,
            staffUserId: session.userId,
            staffName: session.name,
            action: "DELIVERED",
            detail: payment
              ? `Entregado. Cobro $${payment.amount} (${payment.method}); saldo $${Math.max(money.total - paid, 0)}`
              : `Entregado sin cobro; saldo $${money.balance}`,
          },
        });
      }

      await tx.vehicleIntake.update({
        where: { id: intakeId },
        data: { status: "DELIVERED", deliveredAt: new Date() },
      });

      return { success: true as const };
    });

    if (result.success) revalidatePath("/admin", "layout");
    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("deliverVehicle:", error);
    return fail("No se pudo registrar la entrega.");
  }
}

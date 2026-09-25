// Única fuente de verdad de la disponibilidad de la agenda. La usan tanto el
// listado de horarios del wizard (actions/booking.ts) como la creación de la
// reserva (api/webpay/booking/create). Antes cada lado tenía su propia copia y
// no coincidían (bahías simultáneas, hora de cierre fija a las 18:00, sin
// anticipación mínima ni fechas pasadas en el servidor).
//
// Todo se calcula en minutos "de pared" de Chile, sin objetos Date locales:
// el servidor corre en UTC y `new Date(y, m, d, h)` quedaba desfasado 3–4 h.

import type { Prisma } from "@prisma/client";
import { PENDING_HOLD_MINUTES } from "./booking-constants";
import { bookingDateFromDay, chileNow } from "./chile-time";

export type AgendaSettings = {
  workStartHour: number;
  workEndHour: number;
  concurrentBays: number;
  slotInterval: number;
  advanceBookingHours: number;
};

type ServiceForDuration = { id: string; duration: number; variants: Prisma.JsonValue };
type BookingDb = { booking: Pick<Prisma.TransactionClient["booking"], "findMany"> };

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function dayIndex(day: string) {
  return Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 86_400_000);
}

function readVariants(raw: Prisma.JsonValue): { name?: unknown; duration?: unknown }[] {
  if (Array.isArray(raw)) return raw as { name?: unknown; duration?: unknown }[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Duración total en minutos, usando la variante elegida si trae duración propia. */
export function totalDuration(services: ServiceForDuration[], selectedVariants?: Record<string, string>) {
  return services.reduce((sum, s) => {
    const chosen = selectedVariants?.[s.id];
    const variant = chosen ? readVariants(s.variants).find((v) => v.name === chosen) : undefined;
    const duration = typeof variant?.duration === "number" && variant.duration > 0 ? variant.duration : s.duration;
    return sum + duration;
  }, 0);
}

/** Reservas que ocupan una bahía ese día (confirmadas + pendientes frescas). */
export async function getBlockingBookings(db: BookingDb, day: string, excludeId?: string) {
  const start = bookingDateFromDay(day);
  const end = new Date(start.getTime() + 86_400_000);
  const pendingCutoff = new Date(Date.now() - PENDING_HOLD_MINUTES * 60 * 1000);
  return db.booking.findMany({
    where: {
      date: { gte: start, lt: end },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [{ status: "CONFIRMED" }, { status: "PENDING", createdAt: { gte: pendingCutoff } }],
    },
    select: { startTime: true, endTime: true },
  });
}

/** Hora de término de una reserva: inicio + duración, con tope en el cierre. */
export function computeEndTime(startTime: string, duration: number, settings: AgendaSettings) {
  return toTime(Math.min(toMinutes(startTime) + duration, settings.workEndHour * 60));
}

/**
 * Horarios de inicio disponibles ("HH:mm") para un día y una duración.
 * `now = null` omite la anticipación mínima (para revalidar una reserva que
 * ya se hizo, ej. al confirmar un pago tardío).
 */
export function computeAvailableSlots(
  day: string,
  duration: number,
  settings: AgendaSettings,
  bookings: { startTime: string; endTime: string }[],
  now: { date: string; time: string } | null = chileNow(),
  opts: { advanceMinutes?: number } = {}
) {
  const open = settings.workStartHour * 60;
  const close = settings.workEndHour * 60;
  const interval = settings.slotInterval || 30;
  const bays = settings.concurrentBays || 1;
  // `opts.advanceMinutes` permite ignorar la anticipación web (ej. el
  // Tablero calculando el próximo hueco libre para alguien que llega ya).
  const advanceMinutes = opts.advanceMinutes ?? (settings.advanceBookingHours || 12) * 60;

  const earliestStart = now
    ? dayIndex(now.date) * 1440 + toMinutes(now.time) + advanceMinutes
    : -Infinity;
  const dayStart = dayIndex(day) * 1440;

  const slots: string[] = [];
  for (let start = open; start < close; start += interval) {
    let end = start + duration;
    if (end > close) {
      // Se puede recibir un trabajo que termina mañana solo si queda al
      // menos 1 hora de jornada para empezarlo.
      if (close - start < 60) continue;
      end = close;
    }

    if (dayStart + start < earliestStart) continue;

    const overlapping = bookings.filter(
      (b) => start < toMinutes(b.endTime) && end > toMinutes(b.startTime)
    ).length;
    if (overlapping < bays) slots.push(toTime(start));
  }
  return slots;
}

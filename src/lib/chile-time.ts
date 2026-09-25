// Fecha/hora "de pared" en Chile. El servidor (Vercel) corre en UTC, así que
// `new Date().getHours()` o `toLocaleTimeString()` sin zona devuelven la hora
// UTC (3–4 h adelantada respecto de La Serena). Toda lógica que necesite "hoy"
// o "ahora" en el taller debe pasar por acá.
//
// Convención de la BD: `Booking.date` es el día de la reserva a las 00:00 UTC
// (ej. 2026-09-25T00:00:00.000Z) y `startTime`/`endTime` son "HH:mm" en hora
// local de Chile.

export const SHOP_TIME_ZONE = "America/Santiago";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHOP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Fecha ("YYYY-MM-DD") y hora ("HH:mm") actuales en Chile. */
export function chileNow(at: Date = new Date()) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(at).map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

/** Día de Chile como se guarda en `Booking.date` (00:00 UTC de ese día). */
export function bookingDateFromDay(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

/** Rango [inicio, fin) de `Booking.date` que corresponde a "hoy" en Chile. */
export function chileTodayRange(at: Date = new Date()) {
  const start = bookingDateFromDay(chileNow(at).date);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Suma minutos a un "HH:mm" sin pasar de las 23:59 del mismo día. */
export function addMinutesToTime(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

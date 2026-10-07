// Constantes compartidas entre el wizard de agendamiento (cliente) y las
// validaciones de precio/pago en el servidor. Deben ser el mismo módulo en
// ambos lados: si el cálculo de precio vive solo en el cliente, un atacante
// puede mandar cualquier monto al endpoint de pago.

export const VEHICLE_TYPES = [
  'Sedán / Hatchback',
  'SUV o Camionetas Medianas',
  'SUV o Camionetas Grandes',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export function isVehicleType(value: unknown): value is VehicleType {
  return typeof value === "string" && (VEHICLE_TYPES as readonly string[]).includes(value);
}

/**
 * Las reservas guardan vehicleMake como "<tipo> - <marca>". Devuelve el tipo
 * si viene, o null (reservas locales antiguas no lo guardaban).
 */
export function vehicleTypeFromMake(vehicleMake: string): VehicleType | null {
  const prefix = vehicleMake.split(" - ")[0]?.trim();
  return isVehicleType(prefix) ? prefix : null;
}

export type PriceableService = {
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
};

export function getExactPrice(service: PriceableService, vehicleType: string): number {
  if (vehicleType === VEHICLE_TYPES[1]) return service.priceSuv2 || 0;
  if (vehicleType === VEHICLE_TYPES[2]) return service.priceSuv3 || 0;
  return service.priceAuto || 0;
}

// Reserva web SIN pago online: el cliente paga el total en el local.
// (Booking.paymentType = "ON_SITE"; "FULL" = pagó el 100% por Webpay.)
export const ON_SITE_PAYMENT = "ON_SITE";

// Porcentaje del antiguo abono (seña). Ya NO se cobra abono: la reserva web
// se paga al 100%. Solo se usa para estimar el total de reservas antiguas
// pagadas con abono (ver booking-money.ts).
export const RESERVATION_PERCENT = 0.2;

// Minutos que una reserva PENDING (esperando el retorno de Webpay) sigue
// bloqueando el horario. Pasado este tiempo se considera abandonada y el
// slot vuelve a quedar disponible. Debe ser mayor al timeout del formulario
// de pago de Transbank (10 min en integración, 4 min en producción).
export const PENDING_HOLD_MINUTES = 20;

/**
 * Filtro Prisma de reservas "reales" para historial y CRM: excluye las
 * canceladas y los pagos abandonados (PENDING sin pagar pasado el tiempo de
 * retención). Sin esto, quien abandonaba el pago figuraba como cliente con
 * visitas y montos.
 */
export function realBookingWhere(now = Date.now()) {
  return {
    status: { notIn: ["CANCELLED", "NO_SHOW"] },
    NOT: {
      status: "PENDING",
      paymentStatus: "PENDING",
      createdAt: { lt: new Date(now - PENDING_HOLD_MINUTES * 60 * 1000) },
    },
  };
}

// ── Opciones (variantes) de un servicio ──
// Ej. Detailing Exterior: "Nanotecnología (7 meses)", "Cerámico (2 años)"…
// cada una con su duración y precio por tipo de vehículo. La web y el
// ingreso del taller deben ofrecer exactamente las mismas.

export type ServiceVariant = {
  name: string;
  duration?: number;
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
};

/** Lee Service.variants (JSON o string JSON) como una lista válida. */
export function readServiceVariants(raw: unknown): ServiceVariant[] {
  let list: unknown = raw;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && typeof (v as { name?: unknown }).name === "string")
    .map((v) => ({
      name: String(v.name),
      duration: typeof v.duration === "number" ? v.duration : undefined,
      priceAuto: typeof v.priceAuto === "number" ? v.priceAuto : null,
      priceSuv2: typeof v.priceSuv2 === "number" ? v.priceSuv2 : null,
      priceSuv3: typeof v.priceSuv3 === "number" ? v.priceSuv3 : null,
    }));
}

/**
 * Precio de catálogo de un servicio para un tipo de vehículo, usando la
 * opción elegida si el servicio tiene opciones. 0 = sin precio ("a evaluar").
 */
export function servicePriceFor(
  service: PriceableService & { variants?: unknown },
  vehicleType: string,
  variantName?: string | null
) {
  const variant = variantName ? readServiceVariants(service.variants).find((v) => v.name === variantName) : undefined;
  return getExactPrice(variant ?? service, vehicleType);
}

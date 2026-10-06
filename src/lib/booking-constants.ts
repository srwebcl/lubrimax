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

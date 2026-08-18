// Constantes compartidas entre el wizard de agendamiento (cliente) y las
// validaciones de precio/pago en el servidor. Deben ser el mismo módulo en
// ambos lados: si el cálculo de precio vive solo en el cliente, un atacante
// puede mandar cualquier monto al endpoint de pago.

export const VEHICLE_TYPES = [
  'Auto / Hatchback',
  'SUV Medianos',
  'SUV Grandes',
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

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

// Porcentaje de la reserva (seña) sobre el total del servicio.
export const RESERVATION_PERCENT = 0.2;

// Minutos que una reserva PENDING (esperando el retorno de Webpay) sigue
// bloqueando el horario. Pasado este tiempo se considera abandonada y el
// slot vuelve a quedar disponible. Debe ser mayor al timeout del formulario
// de pago de Transbank (10 min en integración, 4 min en producción).
export const PENDING_HOLD_MINUTES = 20;

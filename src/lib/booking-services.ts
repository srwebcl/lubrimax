import { servicePriceFor, vehicleTypeFromMake, VEHICLE_TYPES, type PriceableService } from "./booking-constants";

// Nombres de los servicios de una reserva, incluido el "servicio
// personalizado" que el ingreso sin reserva guarda en selectedOptions
// (ver actions/intake.ts). Lo usan el Tablero, la Agenda y la ficha de cliente.

type WithServices = { services: { id?: string; name: string }[]; selectedOptions: unknown };

/**
 * Opción elegida de un servicio con opciones (ej. "Cerámico (2 años)").
 * selectedOptions guarda { [serviceId]: "<nombre de la opción>" } — así lo
 * deja la reserva web y también el ingreso del taller.
 */
export function selectedVariantOf(selectedOptions: unknown, serviceId: string | undefined): string | null {
  if (!serviceId || !selectedOptions || typeof selectedOptions !== "object") return null;
  const value = (selectedOptions as Record<string, unknown>)[serviceId];
  return typeof value === "string" && value.trim() ? value : null;
}

export function customServiceDetail(selectedOptions: unknown): string | null {
  const detail = (selectedOptions as { customService?: { detail?: unknown } } | null)?.customService?.detail;
  return typeof detail === "string" && detail.trim() ? detail : null;
}

export function bookingServiceNames(b: WithServices) {
  const names = b.services.map((s) => {
    const variant = selectedVariantOf(b.selectedOptions, s.id);
    return variant ? `${s.name} · ${variant}` : s.name;
  });
  const custom = customServiceDetail(b.selectedOptions);
  if (custom) names.push(`[Personalizado] ${custom}`);
  const discount = readDiscount(b.selectedOptions);
  if (discount) names.push(discountLabel(discount));
  return names;
}

// ── Precios "a evaluar" (ingreso sin reserva) ──
// Servicios sin precio de catálogo (ej. mecánica) llevan un precio manual en
// selectedOptions.manualPrices; el servicio personalizado, en
// selectedOptions.customService.price. Ambos se pueden ajustar desde el
// Tablero antes de cobrar (actions/workshop.ts → updateEvaluatedPrices).

export type PricingItem = {
  /** serviceId, o "custom" para el servicio personalizado. */
  key: string;
  name: string;
  /** null = todavía por evaluar. */
  price: number | null;
};

type WithPricing = {
  services: (PriceableService & { id: string; name: string; variants?: unknown })[];
  selectedOptions: unknown;
  /** "<tipo> - <marca>": define qué columna de precio aplica. */
  vehicleMake: string;
};

/**
 * Precio de catálogo del servicio (con su opción elegida) para el tipo de
 * vehículo de la reserva. 0 = a evaluar.
 */
function catalogPrice(
  s: PriceableService & { id: string; variants?: unknown },
  b: { vehicleMake: string; selectedOptions: unknown }
) {
  return servicePriceFor(s, vehicleTypeFromMake(b.vehicleMake) ?? VEHICLE_TYPES[0], selectedVariantOf(b.selectedOptions, s.id));
}

type LocalOptions = {
  customService?: { detail?: string; price?: number };
  manualPrices?: Record<string, number>;
  discount?: BookingDiscount;
};

// ── Descuento (ingreso del taller) ──
// Se guarda en selectedOptions.discount y se aplica sobre el subtotal
// (catálogo + precios evaluados). Un % se recalcula si cambia el subtotal
// (ej. al ajustar un precio "a evaluar" en el Tablero); un monto fijo no.

export type BookingDiscount = { type: "PERCENT" | "AMOUNT"; value: number };

export function readDiscount(selectedOptions: unknown): BookingDiscount | null {
  const d = (selectedOptions as { discount?: { type?: unknown; value?: unknown } } | null)?.discount;
  if (!d || (d.type !== "PERCENT" && d.type !== "AMOUNT") || typeof d.value !== "number" || d.value <= 0) return null;
  return { type: d.type, value: d.value };
}

/** Monto a descontar de un subtotal (nunca más que el subtotal). */
export function discountAmount(discount: BookingDiscount | null, subtotal: number) {
  if (!discount || subtotal <= 0) return 0;
  const raw = discount.type === "PERCENT" ? Math.round((subtotal * Math.min(discount.value, 100)) / 100) : discount.value;
  return Math.min(Math.max(raw, 0), subtotal);
}

/** "Descuento −10%" / "Descuento −$5.000" (para listas de servicios). */
export function discountLabel(discount: BookingDiscount) {
  return discount.type === "PERCENT"
    ? `Descuento −${discount.value}%`
    : `Descuento −$${discount.value.toLocaleString("es-CL")}`;
}

export function readLocalOptions(selectedOptions: unknown): LocalOptions {
  return selectedOptions && typeof selectedOptions === "object" ? (selectedOptions as LocalOptions) : {};
}

/** Ítems cuyo precio se define en el local (no vienen del catálogo). */
export function evaluatedItems(b: WithPricing): PricingItem[] {
  const opts = readLocalOptions(b.selectedOptions);
  const items: PricingItem[] = b.services
    .filter((s) => !catalogPrice(s, b))
    .map((s) => ({ key: s.id, name: s.name, price: opts.manualPrices?.[s.id] ?? null }));
  const custom = customServiceDetail(b.selectedOptions);
  if (custom) {
    // El ingreso guarda 0 cuando el precio del personalizado se dejó vacío.
    items.push({ key: "custom", name: `[Personalizado] ${custom}`, price: opts.customService?.price || null });
  }
  return items;
}

/** Total de una reserva local: catálogo + precios evaluados (lo pendiente suma 0). */
export function localBookingTotal(b: WithPricing) {
  const catalog = b.services.reduce((sum, s) => sum + catalogPrice(s, b), 0);
  const subtotal = catalog + evaluatedItems(b).reduce((sum, i) => sum + (i.price ?? 0), 0);
  return subtotal - discountAmount(readDiscount(b.selectedOptions), subtotal);
}

// Nombres de los servicios de una reserva, incluido el "servicio
// personalizado" que el ingreso sin reserva guarda en selectedOptions
// (ver actions/intake.ts). Lo usan el Tablero, la Agenda y la ficha de cliente.

type WithServices = { services: { name: string }[]; selectedOptions: unknown };

export function customServiceDetail(selectedOptions: unknown): string | null {
  const detail = (selectedOptions as { customService?: { detail?: unknown } } | null)?.customService?.detail;
  return typeof detail === "string" && detail.trim() ? detail : null;
}

export function bookingServiceNames(b: WithServices) {
  const names = b.services.map((s) => s.name);
  const custom = customServiceDetail(b.selectedOptions);
  if (custom) names.push(`[Personalizado] ${custom}`);
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
  services: { id: string; name: string; priceAuto: number | null }[];
  selectedOptions: unknown;
};

type LocalOptions = {
  customService?: { detail?: string; price?: number };
  manualPrices?: Record<string, number>;
};

export function readLocalOptions(selectedOptions: unknown): LocalOptions {
  return selectedOptions && typeof selectedOptions === "object" ? (selectedOptions as LocalOptions) : {};
}

/** Ítems cuyo precio se define en el local (no vienen del catálogo). */
export function evaluatedItems(b: WithPricing): PricingItem[] {
  const opts = readLocalOptions(b.selectedOptions);
  const items: PricingItem[] = b.services
    .filter((s) => !s.priceAuto)
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
  const catalog = b.services.reduce((sum, s) => sum + (s.priceAuto || 0), 0);
  return catalog + evaluatedItems(b).reduce((sum, i) => sum + (i.price ?? 0), 0);
}

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

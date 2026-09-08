// Normalización de patentes chilenas para usarlas como clave única.
// Guardamos SIEMPRE la versión normalizada (mayúsculas, solo letras y
// números) y mostramos con un formato legible.

export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Valida la forma general (4 a 8 caracteres alfanuméricos). No valida el
 *  dígito verificador ni el formato exacto: hay patentes antiguas, de moto,
 *  provisorias, etc. */
export function isValidPlate(raw: string): boolean {
  const p = normalizePlate(raw);
  return /^[A-Z0-9]{4,8}$/.test(p);
}

/** Formato de lectura: "BBBB12" -> "BBBB·12", "AA1234" -> "AA·1234". */
export function formatPlate(raw: string): string {
  const p = normalizePlate(raw);
  if (p.length >= 6) return `${p.slice(0, p.length - 2)}·${p.slice(-2)}`;
  return p;
}

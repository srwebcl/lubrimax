// Normalización de datos de contacto de clientes (nombre, teléfono, RUT).
// Compartido entre servidor (actions) y cliente (listados) para que el mismo
// dato se guarde y se muestre siempre igual.

export function titleCase(str: string) {
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** "+56912345678" / "912345678" / "+56 9 1234 5678" -> "+56 9 1234 5678". */
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return "";
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("569")) p = "+" + p;
  if (p.startsWith("9") && p.length === 9) p = "+56" + p;
  if (p.startsWith("+569") && p.length === 12) {
    return `+56 9 ${p.slice(4, 8)} ${p.slice(8)}`;
  }
  return p;
}

/** Solo los últimos 9 dígitos: clave para comparar teléfonos con distinto formato. */
export function phoneKey(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-9) : "";
}

/** Normaliza un RUT a "12345678-9" (sin puntos, con guion, K en mayúscula). */
export function normalizeRut(rut: string | null | undefined): string | undefined {
  if (!rut) return undefined;
  const clean = rut.replace(/[.\s]/g, "").toUpperCase();
  if (!clean) return undefined;
  return clean.includes("-") ? clean : `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}

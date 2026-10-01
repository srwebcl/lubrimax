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

// ── Formatos chilenos (se aplican en el formulario y se revalidan en el servidor) ──

/** Celular chileno con formato final "+56 9 XXXX XXXX". */
export const CHILE_MOBILE_REGEX = /^\+56 9 \d{4} \d{4}$/;

export function isChileMobile(phone: string | null | undefined) {
  return CHILE_MOBILE_REGEX.test(formatPhone(phone));
}

/** Dígito verificador (módulo 11) del cuerpo de un RUT. */
export function rutCheckDigit(body: string) {
  let sum = 0;
  let factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (sum % 11);
  return dv === 11 ? "0" : dv === 10 ? "K" : String(dv);
}

/** true si el RUT tiene forma válida y su dígito verificador cuadra. */
export function isValidRut(rut: string | null | undefined) {
  const clean = (rut ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 8 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  if (!/^\d+$/.test(body)) return false;
  return rutCheckDigit(body) === clean.slice(-1);
}

/** "123456789" / "12345678-9" / "12.345.678-9" -> "12.345.678-9" (parcial mientras se escribe). */
export function formatRut(rut: string | null | undefined) {
  const clean = (rut ?? "").replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 9);
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${clean.slice(-1)}`;
}

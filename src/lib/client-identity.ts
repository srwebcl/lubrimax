// Cuándo dos reservas web son de la MISMA persona. Correo y teléfono se
// repiten entre personas (correos genéricos anotados en el local, datos de
// prueba, familiares), así que por sí solos NO identifican a nadie: se exige
// además el mismo nombre. Lo usan el directorio de clientes y la ficha.

import { phoneKey, titleCase } from "./contact";

/** Nombre normalizado: sin tildes, minúsculas, espacios simples. */
export function nameKey(name: string) {
  return titleCase(name).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

type WebPerson = { customerName: string; customerPhone: string | null; customerEmail: string | null };

/** Clave de persona para reservas web: nombre + (teléfono, o correo si no hay teléfono). */
export function webPersonKey(b: WebPerson) {
  const contact = phoneKey(b.customerPhone) || b.customerEmail?.toLowerCase().trim() || "";
  return `${nameKey(b.customerName)}|${contact}`;
}

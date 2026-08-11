// Token de sesión de admin firmado con HMAC-SHA256. Reemplaza la cookie de
// valor fijo "authenticated", que cualquiera podía copiar/adivinar para
// entrar al panel.

import { cookies } from "next/headers";
import { createSignedToken, verifySignedToken } from "./signed-token";

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET (o ADMIN_PASSWORD) no está configurado.");
  }
  return secret;
}

export async function createAdminSessionToken(maxAgeSeconds: number) {
  return createSignedToken(getSecret(), {}, maxAgeSeconds);
}

export async function verifyAdminSessionToken(token: string | undefined | null) {
  const payload = await verifySignedToken(getSecret(), token);
  return payload !== null;
}

/**
 * Primera línea obligatoria de todo Server Action bajo /admin. Un Server
 * Action es un endpoint POST alcanzable directamente (no solo "un botón de
 * esa página"): la protección del middleware sobre /admin/:path* no alcanza
 * a las acciones en sí, según la propia guía de seguridad de Next.js.
 * Lanza si no hay sesión de admin válida.
 */
export async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("lubrimax_admin_session")?.value;
  if (!(await verifyAdminSessionToken(session))) {
    throw new Error("No autorizado.");
  }
}

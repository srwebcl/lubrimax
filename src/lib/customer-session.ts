// Token de sesión de cliente firmado con HMAC-SHA256. Antes la cookie
// "lubrimax_customer_session" era el customer.id en texto plano: quien
// conociera o adivinara el id de un cliente podía pegarlo como valor de
// cookie y quedar autenticado como esa persona, sin contraseña. Ahora el id
// va firmado, igual que la sesión de admin (ver admin-session.ts).

import { cookies } from "next/headers";
import { createSignedToken, verifySignedToken } from "./signed-token";

export const CUSTOMER_SESSION_COOKIE = "lubrimax_customer_session";
export const CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

function getSecret() {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret) {
    throw new Error("CUSTOMER_SESSION_SECRET no está configurado.");
  }
  return secret;
}

export async function createCustomerSessionToken(customerId: string, maxAgeSeconds: number) {
  return createSignedToken(getSecret(), { sub: customerId }, maxAgeSeconds);
}

/** Devuelve el customerId si el token es válido, o null. */
export async function verifyCustomerSessionToken(token: string | undefined | null) {
  const payload = await verifySignedToken<{ sub: string }>(getSecret(), token);
  return payload?.sub ?? null;
}

/** Firma y setea la cookie de sesión de cliente. Usar tras login/registro. */
export async function setCustomerSessionCookie(customerId: string) {
  const token = await createCustomerSessionToken(customerId, CUSTOMER_SESSION_MAX_AGE);
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CUSTOMER_SESSION_MAX_AGE,
    path: "/",
  });
}

/** Devuelve el customerId de la sesión actual (verificando la firma), o null. */
export async function getCustomerIdFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  return verifyCustomerSessionToken(token);
}

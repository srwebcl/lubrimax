"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSessionToken } from "@/lib/admin-session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { timingSafeEqual } from "crypto";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 1 semana

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual exige buffers del mismo largo; si difieren ya sabemos
  // que no son iguales, pero igual comparamos contra sí mismo para no
  // filtrar por timing cuánto difiere el largo.
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function login(formData: FormData) {
  const ip = await getClientIp();
  const limit = checkRateLimit(`admin-login:${ip}`, 5, 5 * 60 * 1000);
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Espera ${limit.retryAfterSeconds}s antes de volver a intentar.` };
  }

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  // Sin fallback: si estas variables no están seteadas en el entorno
  // (ej. un preview de Vercel sin las env vars configuradas), el login debe
  // fallar duro en vez de aceptar credenciales de ejemplo conocidas.
  const validUser = process.env.ADMIN_USER;
  const validPwd = process.env.ADMIN_PASSWORD;
  if (!validUser || !validPwd) {
    throw new Error("ADMIN_USER / ADMIN_PASSWORD no están configurados en el servidor.");
  }

  if (username && password && safeEqual(username, validUser) && safeEqual(password, validPwd)) {
    const token = await createAdminSessionToken(SESSION_MAX_AGE);
    const cookieStore = await cookies();
    cookieStore.set("lubrimax_admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  } else {
    return { error: "Credenciales incorrectas. Acceso denegado." };
  }

  redirect("/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("lubrimax_admin_session");
  redirect("/admin/login");
}

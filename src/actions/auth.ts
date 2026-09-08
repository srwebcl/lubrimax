"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  setStaffSessionCookie,
  clearStaffSessionCookie,
  verifyStaffSession,
} from "@/lib/staff-session";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { loginStaffSchema, flattenZodError } from "@/lib/validation";

/**
 * Login del panel para administradores y trabajadores. Ambos roles usan el
 * mismo formulario (/admin/login); el rol se resuelve desde la fila de
 * StaffUser. Reemplaza la antigua credencial única de entorno.
 */
export async function login(formData: FormData) {
  const ip = await getClientIp();

  const parsed = loginStaffSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: flattenZodError(parsed.error) };
  }
  const email = parsed.data.email.toLowerCase().trim();
  const { password } = parsed.data;

  // Doble límite: por IP (frena scripts) y por correo (frena fuerza bruta
  // dirigida a una cuenta desde varias IPs).
  const ipLimit = checkRateLimit(`staff-login-ip:${ip}`, 10, 10 * 60 * 1000);
  const emailLimit = checkRateLimit(`staff-login-email:${email}`, 5, 10 * 60 * 1000);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const wait = Math.max(
      ipLimit.retryAfterSeconds ?? 0,
      emailLimit.retryAfterSeconds ?? 0
    );
    return { error: `Demasiados intentos. Espera ${wait}s antes de volver a intentar.` };
  }

  const user = await prisma.staffUser.findUnique({ where: { email } });

  // Comparación siempre contra un hash (real o dummy) para no filtrar por
  // timing si el correo existe o no.
  const hash =
    user?.password ??
    "$2b$12$0000000000000000000000000000000000000000000000000000a";
  const passwordOk = await bcrypt.compare(password, hash);

  if (!user || !user.isActive || !passwordOk) {
    return { error: "Credenciales incorrectas o cuenta desactivada." };
  }

  await prisma.staffUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await setStaffSessionCookie(user);
  redirect("/admin");
}

export async function logout() {
  await clearStaffSessionCookie();
  redirect("/admin/login");
}

/** Datos mínimos de la sesión actual para la UI del panel (o null). */
export async function getCurrentStaff() {
  return verifyStaffSession();
}

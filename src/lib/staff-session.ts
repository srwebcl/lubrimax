// Sesión del personal que entra al panel (/admin): administradores y
// trabajadores. Reemplaza la vieja credencial única de entorno
// (ADMIN_USER / ADMIN_PASSWORD) por cuentas nominales con rol, guardadas en
// la tabla StaffUser con contraseña hasheada (bcrypt).
//
// En cada request sensible (Server Actions, Route Handlers, layouts del
// panel) se vuelve a consultar la BD para confirmar que el usuario sigue
// activo y que su `sessionEpoch` no cambió — así una desactivación, un
// cambio de contraseña o un "forzar cierre de sesión" invalidan al instante
// las sesiones abiertas.
//
// El chequeo optimista sin BD vive en staff-token.ts (lo usa proxy.ts).

import { cache } from "react";
import { cookies } from "next/headers";
import type { StaffRole } from "@prisma/client";
import { prisma } from "./prisma";
import {
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE,
  createStaffSessionToken,
  verifyStaffTokenPayload,
} from "./staff-token";

export { STAFF_SESSION_COOKIE, STAFF_SESSION_MAX_AGE };

export type StaffSession = {
  userId: string;
  name: string;
  role: StaffRole;
};

/** Firma y setea la cookie de sesión. Usar tras un login exitoso. */
export async function setStaffSessionCookie(user: {
  id: string;
  role: StaffRole;
  sessionEpoch: number;
}) {
  const token = await createStaffSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: STAFF_SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearStaffSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
}

/**
 * Verificación SEGURA de la sesión: firma + expiración + estado en BD.
 * Devuelve la sesión o `null`. Memoizada por render pass con React cache().
 */
export const verifyStaffSession = cache(async (): Promise<StaffSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  const payload = await verifyStaffTokenPayload(token);
  if (!payload) return null;

  try {
    const user = await prisma.staffUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, role: true, isActive: true, sessionEpoch: true },
    });

    if (!user || !user.isActive) return null;
    if (user.sessionEpoch !== payload.epoch) return null;

    return { userId: user.id, name: user.name, role: user.role };
  } catch (error) {
    console.error("verifyStaffSession: error consultando la BD", error);
    return null;
  }
});

/**
 * Primera línea de todo Server Action / Route Handler del panel. Cualquier
 * miembro del personal con sesión válida pasa (admin o trabajador).
 * Lanza si no hay sesión.
 */
export async function requireStaff(): Promise<StaffSession> {
  const session = await verifyStaffSession();
  if (!session) throw new Error("No autorizado.");
  return session;
}

/**
 * Exige un rol concreto. Úsalo en las acciones que solo el administrador
 * puede ejecutar (catálogo, tienda, cupones, ajustes, gestión de usuarios).
 */
export async function requireRole(...roles: StaffRole[]): Promise<StaffSession> {
  const session = await requireStaff();
  if (!roles.includes(session.role)) {
    throw new Error("No autorizado.");
  }
  return session;
}

/** Alias de compatibilidad con el nombre anterior (`requireAdmin`). */
export async function requireAdmin(): Promise<StaffSession> {
  return requireRole("ADMIN");
}

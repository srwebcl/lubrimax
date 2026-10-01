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
import { redirect } from "next/navigation";
import type { StaffRole } from "@prisma/client";
import { prisma } from "./prisma";
import { ALL_WORKER_PERMISSIONS, can, normalizePermissions, type Permission } from "./permissions";
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
  /** Funciones habilitadas (solo relevante para WORKER; el ADMIN tiene todo). */
  permissions: Permission[];
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
      select: { id: true, name: true, role: true, isActive: true, sessionEpoch: true, permissions: true },
    });

    if (!user || !user.isActive) return null;
    if (user.sessionEpoch !== payload.epoch) return null;

    return {
      userId: user.id,
      name: user.name,
      role: user.role,
      permissions: user.role === "ADMIN" ? ALL_WORKER_PERMISSIONS : normalizePermissions(user.permissions),
    };
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

/**
 * Exige una función concreta (ver src/lib/permissions.ts). El ADMIN pasa
 * siempre; el TRABAJADOR solo si el admin se la habilitó.
 */
export async function requirePermission(permission: Permission): Promise<StaffSession> {
  const session = await requireStaff();
  if (!can(session, permission)) {
    throw new Error("No autorizado.");
  }
  return session;
}

/**
 * Para páginas (Server Components) del panel. Los layouts NO se vuelven a
 * ejecutar en navegaciones del lado del cliente, así que cada página que lee
 * datos sensibles valida la sesión por su cuenta: sin sesión va al login y
 * con un rol no permitido vuelve a la agenda.
 */
export async function requireStaffPage(...required: (StaffRole | Permission)[]): Promise<StaffSession> {
  const session = await verifyStaffSession();
  if (!session) redirect("/admin/login");
  const roles = required.filter((r): r is StaffRole => r === "ADMIN" || r === "WORKER");
  const permissions = required.filter((r): r is Permission => r !== "ADMIN" && r !== "WORKER");
  if (roles.length > 0 && !roles.includes(session.role)) redirect("/admin");
  if (permissions.some((p) => !can(session, p))) redirect("/admin");
  return session;
}

/** Alias de compatibilidad con el nombre anterior (`requireAdmin`). */
export async function requireAdmin(): Promise<StaffSession> {
  return requireRole("ADMIN");
}

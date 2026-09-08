// Parte "liviana" de la sesión de personal: firma/verificación del token,
// sin tocar la base de datos ni `next/headers`. Vive en su propio archivo
// para que proxy.ts pueda importarlo sin arrastrar Prisma ni el pool de `pg`
// al bundle del proxy (que corre antes que cada request).
//
// La verificación completa (usuario activo, epoch vigente) está en
// staff-session.ts y solo se usa del lado del servidor "real".

import { createSignedToken, verifySignedToken } from "./signed-token";

// Roles: se replican como unión de strings para no importar el enum de
// Prisma acá (mantiene este módulo libre de dependencias pesadas). Debe
// coincidir con `enum StaffRole` en prisma/schema.prisma.
export type StaffRoleName = "ADMIN" | "WORKER";

export const STAFF_SESSION_COOKIE = "lubrimax_staff_session";
// 12 h absolutas: los trabajadores usan equipos compartidos del taller.
export const STAFF_SESSION_MAX_AGE = 60 * 60 * 12;

export type StaffTokenPayload = {
  sub: string;
  role: StaffRoleName;
  epoch: number;
};

function getSecret() {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "STAFF_SESSION_SECRET no está configurado en el servidor. " +
        "Genera uno con `openssl rand -base64 32` y agrégalo al entorno."
    );
  }
  return secret;
}

export async function createStaffSessionToken(user: {
  id: string;
  role: StaffRoleName;
  sessionEpoch: number;
}) {
  return createSignedToken(
    getSecret(),
    { sub: user.id, role: user.role, epoch: user.sessionEpoch },
    STAFF_SESSION_MAX_AGE
  );
}

/**
 * Verifica SOLO firma + expiración. NO toca la BD. Para chequeos optimistas
 * en proxy.ts. Un token válido acá todavía puede pertenecer a un usuario
 * desactivado: eso lo resuelve verifyStaffSession() en el servidor.
 */
export async function verifyStaffTokenPayload(
  token: string | undefined | null
): Promise<StaffTokenPayload | null> {
  const payload = await verifySignedToken<StaffTokenPayload>(getSecret(), token);
  if (!payload || typeof payload.sub !== "string") return null;
  return payload;
}

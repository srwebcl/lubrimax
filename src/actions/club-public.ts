"use server";

import { prisma } from "@/lib/prisma";
import { rutSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { CLUB_ENABLED } from "@/lib/features";

export async function validateClubRut(rut: string) {
  if (!CLUB_ENABLED) return { valid: false, error: "El Club LUBRIMAX no está disponible por ahora." };
  try {
    // Endpoint público: sin límite permitía recorrer RUTs y listar socios.
    const ip = await getClientIp();
    const limit = checkRateLimit(`club-rut:${ip}`, 5, 10 * 60 * 1000);
    if (!limit.allowed) {
      return { valid: false, error: "Demasiados intentos. Espera unos minutos." };
    }

    const parsed = rutSchema.safeParse(rut);
    if (!parsed.success) return { valid: false, error: "RUT inválido." };

    const customer = await prisma.customer.findUnique({
      where: { rut: parsed.data },
      include: { membership: true }
    });

    if (!customer || !customer.membershipId || !customer.membership) {
      return { valid: false, error: "RUT no está registrado en el Club." };
    }

    if (!customer.membership.isActive) {
      return { valid: false, error: "Tu tipo de membresía actual está desactivado." };
    }

    if (customer.membershipUntil && new Date() > customer.membershipUntil) {
      return { valid: false, error: "Tu membresía del Club ha expirado." };
    }

    const discount = customer.membership.discountPercent || 0;

    // No se devuelve el nombre: confirmaría a quién pertenece un RUT.
    return { valid: true, discountPct: discount };
  } catch (error) {
    return { valid: false, error: "Error al validar el Club." };
  }
}

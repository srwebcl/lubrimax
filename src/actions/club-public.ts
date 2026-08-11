"use server";

import { prisma } from "@/lib/prisma";
import { rutSchema } from "@/lib/validation";

export async function validateClubRut(rut: string) {
  try {
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

    return { 
      valid: true, 
      discountPct: discount,
      customerName: customer.name
    };
  } catch (error) {
    return { valid: false, error: "Error al validar el Club." };
  }
}

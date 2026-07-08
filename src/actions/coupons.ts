"use server";

import { prisma } from "@/lib/prisma";

export async function validateCoupon(code: string) {
  try {
    const coupon = await prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!coupon) return { valid: false, error: "Cupón no existe." };
    if (!coupon.isActive) return { valid: false, error: "Cupón inactivo." };
    
    if (coupon.validUntil && new Date() > coupon.validUntil) {
      return { valid: false, error: "Cupón expirado." };
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { valid: false, error: "El cupón alcanzó su límite de usos." };
    }

    return { 
      valid: true, 
      discountPct: coupon.discountPct 
    };
  } catch (error) {
    return { valid: false, error: "Error al validar el cupón." };
  }
}

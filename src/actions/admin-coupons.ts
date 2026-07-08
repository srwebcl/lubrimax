"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCoupons() {
  try {
    return await prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return [];
  }
}

export async function createCoupon(formData: FormData) {
  try {
    const code = (formData.get("code") as string).toUpperCase();
    const discountPct = parseInt(formData.get("discountPct") as string);
    const usageLimitStr = formData.get("usageLimit") as string;
    const usageLimit = usageLimitStr ? parseInt(usageLimitStr) : null;
    const validUntilStr = formData.get("validUntil") as string;
    const validUntil = validUntilStr ? new Date(validUntilStr) : null;

    if (!code || isNaN(discountPct)) {
      return { success: false, error: "Código y Porcentaje son requeridos" };
    }

    await prisma.discountCode.create({
      data: {
        code,
        discountPct,
        usageLimit,
        validUntil,
        isActive: true
      }
    });

    revalidatePath("/admin/cupones");
    return { success: true };
  } catch (error: any) {
    if (error.code === 'P2002') {
      return { success: false, error: "Ese código ya existe." };
    }
    return { success: false, error: error.message };
  }
}

export async function toggleCouponStatus(id: string, currentStatus: boolean) {
  try {
    await prisma.discountCode.update({
      where: { id },
      data: { isActive: !currentStatus }
    });
    revalidatePath("/admin/cupones");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCoupon(id: string) {
  try {
    await prisma.discountCode.delete({
      where: { id }
    });
    revalidatePath("/admin/cupones");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

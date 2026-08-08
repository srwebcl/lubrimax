"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ==============================
// MEMBERSHIPS
// ==============================
export async function getMemberships() {
  try {
    return await prisma.membershipTier.findMany({
      orderBy: { price: 'asc' }
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createMembership(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const price = parseInt(formData.get("price") as string);
    const discountPercent = parseInt(formData.get("discountPercent") as string);
    const featuresRaw = formData.get("features") as string;
    
    if (!name || isNaN(price) || isNaN(discountPercent)) {
      return { success: false, error: "Datos inválidos." };
    }

    const features = featuresRaw ? featuresRaw.split('\n').filter(f => f.trim() !== '') : [];

    await prisma.membershipTier.create({
      data: {
        name,
        price,
        discountPercent,
        features,
        isActive: true
      }
    });

    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMembership(id: string, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const price = parseInt(formData.get("price") as string);
    const discountPercent = parseInt(formData.get("discountPercent") as string);
    const featuresRaw = formData.get("features") as string;

    const features = featuresRaw ? featuresRaw.split('\n').filter(f => f.trim() !== '') : [];

    await prisma.membershipTier.update({
      where: { id },
      data: {
        name,
        price,
        discountPercent,
        features
      }
    });

    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMembership(id: string) {
  try {
    // Soft delete
    await prisma.membershipTier.update({
      where: { id },
      data: { isActive: false }
    });
    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==============================
// PARTNERS (COMERCIOS)
// ==============================
export async function getPartners() {
  try {
    return await prisma.partner.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createPartner(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const benefitsRaw = formData.get("benefits") as string;
    const logo = formData.get("logo") as string;
    
    if (!name) {
      return { success: false, error: "Falta el nombre del comercio." };
    }

    const benefits = benefitsRaw ? benefitsRaw.split('\n').filter(b => b.trim() !== '') : [];

    await prisma.partner.create({
      data: {
        name,
        description,
        benefits,
        logo: logo || null,
        isActive: true
      }
    });

    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePartner(id: string, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const benefitsRaw = formData.get("benefits") as string;
    const logo = formData.get("logo") as string;
    
    if (!name) {
      return { success: false, error: "Falta el nombre del comercio." };
    }

    const benefits = benefitsRaw ? benefitsRaw.split('\n').filter(b => b.trim() !== '') : [];

    const data: any = {
      name,
      description,
      benefits
    };

    if (logo) {
      data.logo = logo;
    }

    await prisma.partner.update({
      where: { id },
      data
    });

    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePartner(id: string) {
  try {
    await prisma.partner.update({
      where: { id },
      data: { isActive: false }
    });
    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

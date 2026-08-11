"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, updateTag, unstable_cache } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";

// ==============================
// MEMBERSHIPS
// ==============================
// getMemberships/getPartners NO llevan requireAdmin(): también las usa la
// página pública /club (ver src/app/(public)/club/page.tsx) para listar
// planes y comercios asociados a cualquier visitante. Cacheadas: cambian
// poco y se leen en cada visita a /club.
async function fetchMemberships() {
  try {
    return await prisma.membershipTier.findMany({
      orderBy: { price: 'asc' }
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

export const getMemberships = unstable_cache(fetchMemberships, ["memberships"], {
  tags: ["memberships"],
  revalidate: 300,
});

export async function createMembership(formData: FormData) {
  try {
    await requireAdmin();

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

    updateTag("memberships");
    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMembership(id: string, formData: FormData) {
  try {
    await requireAdmin();

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

    updateTag("memberships");
    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMembership(id: string) {
  try {
    await requireAdmin();

    // Soft delete
    await prisma.membershipTier.update({
      where: { id },
      data: { isActive: false }
    });
    updateTag("memberships");
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
async function fetchPartners() {
  try {
    return await prisma.partner.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}

export const getPartners = unstable_cache(fetchPartners, ["partners"], {
  tags: ["partners"],
  revalidate: 300,
});

export async function createPartner(formData: FormData) {
  try {
    await requireAdmin();

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

    updateTag("partners");
    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePartner(id: string, formData: FormData) {
  try {
    await requireAdmin();

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

    updateTag("partners");
    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePartner(id: string) {
  try {
    await requireAdmin();

    await prisma.partner.update({
      where: { id },
      data: { isActive: false }
    });
    updateTag("partners");
    revalidatePath("/admin/club");
    revalidatePath("/club");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

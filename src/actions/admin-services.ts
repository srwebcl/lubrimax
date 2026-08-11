"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";

export async function getAdminServices() {
  try {
    await requireAdmin();

    return await prisma.service.findMany({
      orderBy: { category: 'asc' }
    });
  } catch (error) {
    console.error("Error fetching admin services:", error);
    return [];
  }
}

export async function createService(formData: FormData) {
  try {
    await requireAdmin();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const duration = parseInt(formData.get("duration") as string);
    const priceAuto = formData.get("priceAuto") ? parseInt(formData.get("priceAuto") as string) : null;
    const priceSuv2 = formData.get("priceSuv2") ? parseInt(formData.get("priceSuv2") as string) : null;
    const priceSuv3 = formData.get("priceSuv3") ? parseInt(formData.get("priceSuv3") as string) : null;
    const badgesStr = formData.get("badges") as string;
    const badges = badgesStr ? badgesStr.split(",").map(b => b.trim()).filter(b => b) : [];

    if (!name || isNaN(duration)) {
      return { success: false, error: "Faltan campos obligatorios o son inválidos." };
    }

    await prisma.service.create({
      data: {
        name,
        description,
        category,
        duration,
        priceAuto,
        priceSuv2,
        priceSuv3,
        badges,
      }
    });

    updateTag("services");
    revalidatePath("/admin/servicios");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteService(id: string) {
  try {
    await requireAdmin();

    // Verificar si hay reservas asociadas (opcional: o borrar en cascada)
    const bookings = await prisma.booking.count({ where: { services: { some: { id } } } });
    if (bookings > 0) {
      return { success: false, error: "No se puede eliminar un servicio que tiene reservas activas." };
    }

    await prisma.service.delete({
      where: { id }
    });

    updateTag("services");
    revalidatePath("/admin/servicios");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateService(id: string, formData: FormData) {
  try {
    await requireAdmin();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as string;
    const duration = parseInt(formData.get("duration") as string);
    const priceAuto = formData.get("priceAuto") ? parseInt(formData.get("priceAuto") as string) : null;
    const priceSuv2 = formData.get("priceSuv2") ? parseInt(formData.get("priceSuv2") as string) : null;
    const priceSuv3 = formData.get("priceSuv3") ? parseInt(formData.get("priceSuv3") as string) : null;
    const badgesStr = formData.get("badges") as string;
    const badges = badgesStr ? badgesStr.split(",").map(b => b.trim()).filter(b => b) : [];

    if (!name || isNaN(duration)) {
      return { success: false, error: "Faltan campos obligatorios o son inválidos." };
    }

    await prisma.service.update({
      where: { id },
      data: {
        name,
        description,
        category,
        duration,
        priceAuto,
        priceSuv2,
        priceSuv3,
        badges,
      }
    });

    updateTag("services");
    revalidatePath("/admin/servicios");
    revalidatePath("/agendar");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

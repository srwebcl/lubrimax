"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAdminCategories() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function createCategory(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const image = formData.get("image") as string;
    const color = formData.get("color") as string;
    const isActive = formData.get("isActive") === "true";

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    await prisma.serviceCategory.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        color: color || null,
        isActive,
      }
    });

    revalidatePath("/admin/categorias");
    revalidatePath("/servicios");
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error creating category:", error);
    return { success: false, error: error.message || "Error al crear categoría." };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const image = formData.get("image") as string;
    const color = formData.get("color") as string;
    const isActive = formData.get("isActive") === "true";

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    await prisma.serviceCategory.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        color: color || null,
        isActive,
      }
    });

    revalidatePath("/admin/categorias");
    revalidatePath("/servicios");
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating category:", error);
    return { success: false, error: error.message || "Error al actualizar categoría." };
  }
}

export async function deleteCategory(id: string) {
  try {
    await prisma.serviceCategory.delete({
      where: { id }
    });

    revalidatePath("/admin/categorias");
    revalidatePath("/servicios");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting category:", error);
    return { success: false, error: "No se puede eliminar la categoría. Asegúrate de que no tenga servicios asociados." };
  }
}

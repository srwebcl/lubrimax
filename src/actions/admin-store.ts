"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProducts() {
  try {
    return await prisma.product.findMany({
      include: { 
        category: true,
        images: true,
        variants: true
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export type ProductPayload = {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  stock: number;
  image: string; // Thumbnail principal
  images: string[]; // URLs adicionales
  variants: { id?: string; name: string; price: number | null; stock: number }[];
};

export async function createProduct(data: ProductPayload) {
  try {
    if (!data.name || isNaN(data.price)) {
      return { success: false, error: "Faltan campos obligatorios o son inválidos." };
    }

    await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId || null,
        image: data.image || null,
        price: data.price,
        stock: data.stock,
        isActive: true,
        images: {
          create: data.images.map(url => ({ url }))
        },
        variants: {
          create: data.variants.map(v => ({
            name: v.name,
            price: v.price,
            stock: v.stock
          }))
        }
      }
    });

    revalidatePath("/admin/tienda");
    revalidatePath("/tienda");
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProduct(id: string, data: ProductPayload) {
  try {
    if (!data.name || isNaN(data.price)) {
      return { success: false, error: "Faltan campos obligatorios o son inválidos." };
    }

    // Usamos una transacción para limpiar y recrear relaciones de forma segura
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos base del producto
      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          categoryId: data.categoryId || null,
          image: data.image || null,
          price: data.price,
          stock: data.stock,
        }
      });

      // 2. Sincronizar imágenes (borrar y crear nuevas)
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map(url => ({ url, productId: id }))
        });
      }

      // 3. Sincronizar variantes (borrar y crear nuevas)
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (data.variants.length > 0) {
        await tx.productVariant.createMany({
          data: data.variants.map(v => ({
            name: v.name,
            price: v.price,
            stock: v.stock,
            productId: id
          }))
        });
      }
    });

    revalidatePath("/admin/tienda");
    revalidatePath("/tienda");
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.update({
      where: { id },
      data: { isActive: false }
    });

    revalidatePath("/admin/tienda");
    revalidatePath("/tienda");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// CATEGORÍAS
// ==========================================

export async function getCategories() {
  try {
    return await prisma.productCategory.findMany({
      orderBy: { name: 'asc' }
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function createCategory(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    if (!name) return { success: false, error: "Nombre requerido" };

    await prisma.productCategory.create({
      data: { name }
    });
    
    revalidatePath("/admin/tienda");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCategory(id: string) {
  try {
    await prisma.productCategory.delete({ where: { id } });
    revalidatePath("/admin/tienda");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "No se puede eliminar porque tiene productos asociados" };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/staff-session";

export async function getProducts() {
  try {
    await requireAdmin();

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
    await requireAdmin();

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

    updateTag("products");
    revalidatePath("/admin/tienda");
    revalidatePath("/tienda");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProduct(id: string, data: ProductPayload) {
  try {
    await requireAdmin();

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

    updateTag("products");
    revalidatePath("/admin/tienda");
    revalidatePath("/tienda");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Activa o desactiva un producto (no lo borra: solo deja de mostrarse en la tienda). */
export async function toggleProductStatus(id: string, currentStatus: boolean) {
  try {
    await requireAdmin();

    await prisma.product.update({
      where: { id },
      data: { isActive: !currentStatus }
    });

    updateTag("products");
    revalidatePath("/admin/tienda");
    revalidatePath("/tienda");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** @deprecated usar toggleProductStatus — se mantiene por compatibilidad. */
export async function deleteProduct(id: string) {
  return toggleProductStatus(id, true);
}

/**
 * Elimina el producto de forma permanente (borra también sus imágenes,
 * variantes y reseñas en cascada). Falla a propósito si el producto tiene
 * pedidos asociados: borrarlo rompería el historial de compras de un
 * cliente real.
 */
export async function deleteProductPermanently(id: string) {
  try {
    await requireAdmin();

    const ordersCount = await prisma.orderItem.count({ where: { productId: id } });
    if (ordersCount > 0) {
      return {
        success: false,
        error: "No se puede eliminar: este producto tiene pedidos asociados. Desactívalo en su lugar.",
      };
    }

    await prisma.product.delete({ where: { id } });

    updateTag("products");
    revalidatePath("/admin/tienda");
    revalidatePath("/tienda");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2003" || error.code === "P2014") {
      return {
        success: false,
        error: "No se puede eliminar: este producto tiene pedidos asociados. Desactívalo en su lugar.",
      };
    }
    return { success: false, error: error.message || "No se pudo eliminar el producto." };
  }
}

// ==========================================
// CATEGORÍAS
// ==========================================

export async function getCategories() {
  try {
    await requireAdmin();

    return await prisma.productCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } }
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function createCategory(formData: FormData) {
  try {
    await requireAdmin();

    const name = (formData.get("name") as string)?.trim();
    if (!name) return { success: false, error: "Nombre requerido" };

    const category = await prisma.productCategory.create({
      data: { name }
    });

    updateTag("products");
    revalidatePath("/admin/tienda");
    return { success: true, category };
  } catch (error: any) {
    // P2002 = violación de índice único (ya existe una categoría con ese nombre).
    if (error.code === "P2002") {
      return { success: false, error: "Ya existe una categoría con ese nombre." };
    }
    return { success: false, error: error.message || "No se pudo crear la categoría." };
  }
}

export async function deleteCategory(id: string) {
  try {
    await requireAdmin();

    await prisma.productCategory.delete({ where: { id } });
    updateTag("products");
    revalidatePath("/admin/tienda");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "No se puede eliminar porque tiene productos asociados" };
  }
}

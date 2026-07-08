"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function submitReview(formData: FormData) {
  try {
    const productId = formData.get("productId") as string;
    const rut = formData.get("rut") as string;
    const rating = parseInt(formData.get("rating") as string);
    const comment = formData.get("comment") as string;

    if (!productId || !rut || isNaN(rating) || rating < 1 || rating > 5) {
      return { success: false, error: "Datos inválidos para la reseña." };
    }

    // 1. Validar que el cliente exista
    const customer = await prisma.customer.findUnique({
      where: { rut }
    });

    if (!customer) {
      return { success: false, error: "RUT no registrado en compras." };
    }

    // 2. Validar que el cliente tenga una orden DELIVERED que contenga este producto
    const orderWithProduct = await prisma.order.findFirst({
      where: {
        customerId: customer.id,
        status: "DELIVERED",
        items: {
          some: {
            productId: productId
          }
        }
      }
    });

    if (!orderWithProduct) {
      return { success: false, error: "Solo compradores verificados que han recibido el producto pueden dejar reseñas." };
    }

    // 3. Revisar si ya dejó una reseña para no duplicar
    const existingReview = await prisma.review.findFirst({
      where: {
        customerId: customer.id,
        productId: productId
      }
    });

    if (existingReview) {
      return { success: false, error: "Ya has dejado una reseña para este producto." };
    }

    // 4. Crear reseña
    await prisma.review.create({
      data: {
        rating,
        comment,
        customerId: customer.id,
        productId: productId,
        isApproved: true // Por defecto aprobada (se puede ocultar desde admin después si se desea)
      }
    });

    revalidatePath(`/tienda/${productId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Error al procesar la reseña." };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, updateTag } from "next/cache";
import { getSessionCustomer } from "./customer-auth";
import { reviewSchema, flattenZodError } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function submitReview(formData: FormData) {
  try {
    const ip = await getClientIp();
    const limit = checkRateLimit(`submit-review:${ip}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) {
      return { success: false, error: "Demasiadas reseñas enviadas. Intenta más tarde." };
    }

    const parsed = reviewSchema.safeParse({
      productId: formData.get("productId"),
      rating: formData.get("rating"),
      comment: formData.get("comment") || undefined,
    });
    if (!parsed.success) {
      return { success: false, error: flattenZodError(parsed.error) };
    }
    const { productId, rating, comment } = parsed.data;

    // La identidad viene de la sesión firmada, no de un campo del formulario:
    // antes cualquiera podía escribir el RUT de otra persona y dejar una
    // reseña "verificada" a su nombre sin haber iniciado sesión.
    const customer = await getSessionCustomer();

    if (!customer) {
      return { success: false, error: "Debes iniciar sesión para dejar una reseña." };
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

    updateTag("products");
    revalidatePath(`/tienda/${productId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: "Error al procesar la reseña." };
  }
}

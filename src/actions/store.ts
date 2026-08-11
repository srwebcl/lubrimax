"use server";

import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

async function fetchPublicProducts() {
  try {
    return await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        category: true,
        images: true,
        variants: true
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Error fetching public products:", error);
    return [];
  }
}

async function fetchProductById(id: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        variants: true,
        reviews: {
          include: { customer: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Si no está activo o no existe
    if (!product || !product.isActive) return null;

    return product;
  } catch (error) {
    console.error("Error fetching product details:", error);
    return null;
  }
}

// Cacheadas con revalidate corto (60s): stock y reseñas cambian seguido
// (compras, reseñas nuevas), pero la invalidación explícita con "products"
// (ver admin-store.ts, reviews.ts y webpay/commit) hace que los cambios se
// vean al tiro sin esperar esos 60s en la mayoría de los casos.
export const getPublicProducts = unstable_cache(fetchPublicProducts, ["public-products"], {
  tags: ["products"],
  revalidate: 60,
});

export const getProductById = unstable_cache(fetchProductById, ["product-by-id"], {
  tags: ["products"],
  revalidate: 60,
});

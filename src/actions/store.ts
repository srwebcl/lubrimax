"use server";

import { prisma } from "@/lib/prisma";

export async function getPublicProducts() {
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

export async function getProductById(id: string) {
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

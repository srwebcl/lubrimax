"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

export async function getOrders() {
  try {
    return await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { name: true, email: true, phone: true }
        },
        items: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

export async function updateOrderStatus(id: string, formData: FormData) {
  try {
    const status = formData.get("status") as string;
    const trackingCode = formData.get("trackingCode") as string;
    
    const order = await prisma.order.update({
      where: { id },
      data: {
        status,
        ...(trackingCode ? { trackingCode } : {})
      },
      include: { customer: true }
    });

    if (status === "SHIPPED") {
      await sendEmail({
        to: order.customer.email,
        subject: `Tu pedido ha sido enviado - Lubrimax`,
        react: (
          `<h1>¡Buenas noticias, ${order.customer.name}!</h1>
           <p>Tu pedido #${order.id.slice(-8).toUpperCase()} ya está en camino.</p>
           ${trackingCode ? `<p>Código de seguimiento: <strong>${trackingCode}</strong></p>` : ''}`
        ) as any
      });
    }

    revalidatePath("/admin/pedidos");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

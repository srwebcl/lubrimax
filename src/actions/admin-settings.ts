"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSettings() {
  let settings = await prisma.settings.findUnique({
    where: { id: "global" }
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        id: "global",
        workStartHour: 9,
        workEndHour: 18,
        concurrentBays: 1,
        slotInterval: 30
      }
    });
  }

  return settings;
}

export async function updateSettings(formData: FormData) {
  try {
    const workStartHour = parseInt(formData.get("workStartHour") as string);
    const workEndHour = parseInt(formData.get("workEndHour") as string);
    const concurrentBays = parseInt(formData.get("concurrentBays") as string);
    const slotInterval = parseInt(formData.get("slotInterval") as string);

    if (isNaN(workStartHour) || isNaN(workEndHour) || isNaN(concurrentBays) || isNaN(slotInterval)) {
      return { success: false, error: "Valores inválidos" };
    }

    if (workStartHour >= workEndHour) {
      return { success: false, error: "La hora de apertura debe ser menor a la de cierre" };
    }

    await prisma.settings.upsert({
      where: { id: "global" },
      update: {
        workStartHour,
        workEndHour,
        concurrentBays,
        slotInterval,
      },
      create: {
        id: "global",
        workStartHour,
        workEndHour,
        concurrentBays,
        slotInterval,
      }
    });

    revalidatePath("/admin/configuracion");
    revalidatePath("/agendar");
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath, updateTag, unstable_cache } from "next/cache";
import { requireAdmin } from "@/lib/admin-session";

async function fetchSettings() {
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
        slotInterval: 30,
        advanceBookingHours: 12
      }
    });
  }

  return settings;
}

// getSettings NO lleva requireAdmin(): también la usa el flujo público de
// agendamiento (actions/booking.ts) para calcular horarios disponibles.
// Cacheada: son valores de configuración que casi no cambian, y se leen en
// cada carga del widget de reservas. Se invalida al tiro en updateSettings.
export const getSettings = unstable_cache(fetchSettings, ["settings"], {
  tags: ["settings"],
  revalidate: 300,
});

export async function updateSettings(formData: FormData) {
  try {
    await requireAdmin();

    const workStartHour = parseInt(formData.get("workStartHour") as string);
    const workEndHour = parseInt(formData.get("workEndHour") as string);
    const concurrentBays = parseInt(formData.get("concurrentBays") as string);
    const slotInterval = parseInt(formData.get("slotInterval") as string);
    const advanceBookingHours = parseInt(formData.get("advanceBookingHours") as string) || 12;

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
        advanceBookingHours,
      },
      create: {
        id: "global",
        workStartHour,
        workEndHour,
        concurrentBays,
        slotInterval,
        advanceBookingHours,
      }
    });

    updateTag("settings");
    revalidatePath("/admin/configuracion");
    revalidatePath("/agendar");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

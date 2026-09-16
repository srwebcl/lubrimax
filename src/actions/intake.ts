"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/staff-session";
import { intakeSchema, flattenZodError } from "@/lib/validation";
import { normalizePlate, isValidPlate } from "@/lib/plate";

function fail(error: string) {
  return { success: false as const, error };
}

/** Normaliza un RUT a "12345678-9" (sin puntos, con guion, K en mayúscula). */
function normalizeRut(rut: string | undefined): string | undefined {
  if (!rut) return undefined;
  const clean = rut.replace(/[.\s]/g, "").toUpperCase();
  const withDash = clean.includes("-")
    ? clean
    : `${clean.slice(0, -1)}-${clean.slice(-1)}`;
  return withDash;
}

export type PlateLookup = {
  found: boolean;
  client?: { id: string; name: string; rut: string | null; phone: string | null; email: string | null };
  vehicle?: { id: string; plate: string; make: string; model: string; color: string | null };
  openIntakeId?: string; // si ya hay un ingreso "en taller" para este vehículo
  lastVisit?: string | null;
};

/** Busca un vehículo por patente. Devuelve datos del cliente si existe. */
export async function lookupByPlate(plateRaw: string): Promise<PlateLookup> {
  await requireStaff();

  if (!isValidPlate(plateRaw)) {
    return { found: false };
  }
  const plate = normalizePlate(plateRaw);

  const vehicle = await prisma.vehicle.findUnique({
    where: { plate },
    include: {
      client: true,
      intakes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!vehicle) {
    // Buscar en reservas recientes si no existe en la BD maestra de vehículos
    const recentBooking = await prisma.booking.findFirst({
      where: { vehicleModel: { contains: `Patente: ${plate}` } },
      orderBy: { createdAt: "desc" }
    });

    if (recentBooking) {
      const make = recentBooking.vehicleMake.split(" - ").pop() || "";
      const model = recentBooking.vehicleModel.split(" (Patente:")[0] || "";
      
      return {
        found: false, // false porque aún no es cliente oficial del taller
        client: {
          id: "",
          name: recentBooking.customerName,
          rut: null,
          phone: recentBooking.customerPhone,
          email: recentBooking.customerEmail,
        },
        vehicle: {
          id: "",
          plate: plate,
          make,
          model,
          color: null,
        },
      };
    }
    return { found: false };
  }

  const open = await prisma.vehicleIntake.findFirst({
    where: { vehicleId: vehicle.id, status: "IN_SHOP" },
    select: { id: true },
  });

  return {
    found: true,
    client: {
      id: vehicle.client.id,
      name: vehicle.client.name,
      rut: vehicle.client.rut,
      phone: vehicle.client.phone,
      email: vehicle.client.email,
    },
    vehicle: {
      id: vehicle.id,
      plate: vehicle.plate,
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color,
    },
    openIntakeId: open?.id,
    lastVisit: vehicle.intakes[0]?.createdAt.toISOString() ?? null,
  };
}

/**
 * Registra el ingreso de un vehículo al taller. Crea/actualiza el cliente y
 * el vehículo (por patente) y crea el evento de ingreso.
 */
export async function registerIntake(formData: FormData) {
  const session = await requireStaff();

  const parsed = intakeSchema.safeParse({
    plate: formData.get("plate"),
    make: formData.get("make"),
    model: formData.get("model"),
    color: formData.get("color") || undefined,
    clientName: formData.get("clientName"),
    clientRut: formData.get("clientRut") || "",
    clientPhone: formData.get("clientPhone") || undefined,
    clientEmail: formData.get("clientEmail") || "",
    odometer: formData.get("odometer") || "",
    notes: formData.get("notes") || undefined,
    photoUrl: formData.get("photoUrl") || "",
    bookingId: formData.get("bookingId") || undefined,
  });
  if (!parsed.success) return fail(flattenZodError(parsed.error));

  const d = parsed.data;
  if (!isValidPlate(d.plate)) return fail("Patente inválida.");
  const plate = normalizePlate(d.plate);
  const rut = normalizeRut(d.clientRut);
  const email = d.clientEmail ? d.clientEmail : undefined;
  const phone = d.clientPhone ? d.clientPhone : undefined;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingVehicle = await tx.vehicle.findUnique({
        where: { plate },
        include: { client: true },
      });

      // 1. Resolver el cliente
      let clientId: string;
      if (rut) {
        const byRut = await tx.workshopClient.findUnique({ where: { rut } });
        if (byRut) {
          clientId = byRut.id;
          await tx.workshopClient.update({
            where: { id: byRut.id },
            data: {
              name: d.clientName,
              phone: phone ?? byRut.phone,
              email: email ?? byRut.email,
            },
          });
        } else {
          clientId = (
            await tx.workshopClient.create({
              data: {
                name: d.clientName,
                rut,
                phone,
                email,
                createdByStaffId: session.userId,
              },
            })
          ).id;
        }
      } else if (existingVehicle) {
        // Sin RUT: reutilizamos el cliente ya asociado a esa patente.
        clientId = existingVehicle.clientId;
        await tx.workshopClient.update({
          where: { id: clientId },
          data: {
            name: d.clientName,
            phone: phone ?? existingVehicle.client.phone,
            email: email ?? existingVehicle.client.email,
          },
        });
      } else {
        clientId = (
          await tx.workshopClient.create({
            data: {
              name: d.clientName,
              phone,
              email,
              createdByStaffId: session.userId,
            },
          })
        ).id;
      }

      // 2. Upsert del vehículo por patente
      const vehicle = await tx.vehicle.upsert({
        where: { plate },
        create: { plate, make: d.make, model: d.model, color: d.color, clientId },
        update: { make: d.make, model: d.model, color: d.color, clientId },
      });

      // 3. Validar la reserva enlazada (si vino)
      let bookingId: string | undefined;
      if (d.bookingId) {
        const b = await tx.booking.findUnique({ where: { id: d.bookingId }, select: { id: true } });
        bookingId = b?.id;
      }

      // 4. Crear el ingreso
      const intake = await tx.vehicleIntake.create({
        data: {
          vehicleId: vehicle.id,
          bookingId,
          photoUrl: d.photoUrl || null,
          odometer: d.odometer,
          notes: d.notes,
          status: "IN_SHOP",
          createdByStaffId: session.userId,
          createdByStaffName: session.name,
        },
      });

      return { intakeId: intake.id, plate };
    });

    revalidatePath("/admin/ingreso");
    revalidatePath("/admin");
    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("registerIntake:", error);
    return fail("No se pudo registrar el ingreso.");
  }
}

/** Vehículos actualmente en el taller (ingresos con estado IN_SHOP). */
export async function getShopStatus() {
  await requireStaff();
  const intakes = await prisma.vehicleIntake.findMany({
    where: { status: "IN_SHOP" },
    orderBy: { createdAt: "desc" },
    include: { vehicle: { include: { client: true } } },
  });
  return intakes.map((i) => ({
    id: i.id,
    plate: i.vehicle.plate,
    make: i.vehicle.make,
    model: i.vehicle.model,
    clientName: i.vehicle.client.name,
    clientPhone: i.vehicle.client.phone,
    photoUrl: i.photoUrl,
    notes: i.notes,
    staffName: i.createdByStaffName,
    createdAt: i.createdAt.toISOString(),
  }));
}

/** Marca un ingreso como entregado (el auto sale del taller). */
export async function markDelivered(intakeId: string) {
  try {
    await requireStaff();
    await prisma.vehicleIntake.update({
      where: { id: intakeId },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });
    revalidatePath("/admin/ingreso");
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("markDelivered:", error);
    return fail("No se pudo marcar como entregado.");
  }
}

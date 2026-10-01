"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/staff-session";
import { intakeSchema, manualIntakeServicesSchema, flattenZodError } from "@/lib/validation";
import { normalizePlate, isValidPlate, parseBookingVehicle } from "@/lib/plate";
import { chileNow, bookingDateFromDay, addMinutesToTime } from "@/lib/chile-time";
import { normalizeRut, formatPhone, titleCase } from "@/lib/contact";

/** Error de negocio con mensaje apto para mostrar al usuario. */
class IntakeError extends Error {}

function fail(error: string) {
  return { success: false as const, error };
}

export type PlateLookup = {
  /** true si la patente ya es un vehículo del taller (tabla Vehicle). */
  found: boolean;
  /**
   * De dónde salen los datos precargados: "WORKSHOP" = cliente del taller,
   * "WEB" = solo conocido por una reserva web (se consolida al registrar),
   * ausente = patente nueva.
   */
  source?: "WORKSHOP" | "WEB";
  client?: { id: string; name: string; rut: string | null; phone: string | null; email: string | null };
  vehicle?: { id: string; plate: string; make: string; model: string; color: string | null };
  openIntakeId?: string; // si ya hay un ingreso "en taller" para este vehículo
  /** Último kilometraje registrado para este vehículo (cualquier visita). */
  lastOdometer?: { km: number; date: string } | null;
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
    // No es vehículo del taller: buscarlo en reservas web. La patente se
    // compara NORMALIZADA en SQL: reservas antiguas la guardaron tal como la
    // tipeó el cliente ("Jybg-69") y un `contains` exacto no las encontraba.
    const [match] = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Booking"
      WHERE upper(regexp_replace(substring("vehicleModel" from 'Patente:[[:space:]]*([^)]+)'), '[^A-Za-z0-9]', '', 'g')) = ${plate}
      ORDER BY "createdAt" DESC
      LIMIT 1`;
    const recentBooking = match ? await prisma.booking.findUnique({ where: { id: match.id } }) : null;

    if (recentBooking) {
      const { make, model } = parseBookingVehicle(recentBooking.vehicleMake, recentBooking.vehicleModel);

      return {
        found: false, // aún no es cliente oficial del taller
        source: "WEB",
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

  const [open, lastWithKm] = await Promise.all([
    prisma.vehicleIntake.findFirst({
      where: { vehicleId: vehicle.id, status: "IN_SHOP" },
      select: { id: true },
    }),
    // Cada visita guarda su propio kilometraje (historial); acá solo se
    // trae el último para mostrarlo y compararlo en el nuevo ingreso.
    prisma.vehicleIntake.findFirst({
      where: { vehicleId: vehicle.id, odometer: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { odometer: true, createdAt: true },
    }),
  ]);

  return {
    found: true,
    source: "WORKSHOP",
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
    lastOdometer: lastWithKm?.odometer != null
      ? { km: lastWithKm.odometer, date: lastWithKm.createdAt.toISOString() }
      : null,
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
    clientPhone: formData.get("clientPhone") ?? "",
    clientEmail: formData.get("clientEmail") ?? "",
    odometer: formData.get("odometer") || "",
    notes: formData.get("notes") || undefined,
    photoUrl: formData.get("photoUrl") || "",
    bookingId: formData.get("bookingId") || undefined,
  });
  if (!parsed.success) return fail(flattenZodError(parsed.error));

  const d = parsed.data;
  if (!isValidPlate(d.plate)) return fail("Patente inválida.");
  // La foto debe venir de nuestro bucket (la sube uploadFileToR2).
  const r2Base = process.env.NEXT_PUBLIC_R2_DEV_URL;
  if (d.photoUrl && !(r2Base ? d.photoUrl.startsWith(`${r2Base}/`) : d.photoUrl.startsWith("https://"))) {
    return fail("Foto inválida.");
  }

  // Ingreso sin reserva web: se crea una cita interna con estos servicios.
  let manual: {
    serviceIds: string[];
    customServiceDetail?: string;
    customServicePrice: number;
    manualPrices: Record<string, number>;
  } | null = null;
  if (!d.bookingId) {
    // Precios manuales: campos "manualPrice:<serviceId>" con valor no vacío.
    const manualPrices: Record<string, number> = {};
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("manualPrice:") || typeof value !== "string" || value.trim() === "") continue;
      manualPrices[key.slice("manualPrice:".length)] = Number(value);
    }
    const manualParsed = manualIntakeServicesSchema.safeParse({
      serviceIds: formData.getAll("serviceIds").map(String),
      customServiceDetail: formData.get("customServiceDetail") || undefined,
      customServicePrice: formData.get("customServicePrice") ?? "",
      manualPrices,
    });
    if (!manualParsed.success) return fail(flattenZodError(manualParsed.error));
    manual = { ...manualParsed.data, serviceIds: [...new Set(manualParsed.data.serviceIds)] };
  }
  const plate = normalizePlate(d.plate);
  const rut = normalizeRut(d.clientRut);
  const email = d.clientEmail.toLowerCase();
  const phone = formatPhone(d.clientPhone);
  // "Nombre Apellido", sin importar cómo se tipeó.
  d.clientName = titleCase(d.clientName);

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

      // 3. Validar la reserva enlazada (si vino) o Crear una nueva para ingresos manuales
      let bookingId: string | undefined;
      
      if (d.bookingId) {
        const b = await tx.booking.findUnique({ where: { id: d.bookingId }, select: { id: true } });
        if (!b) throw new IntakeError("La reserva seleccionada ya no existe. Recarga la página.");
        bookingId = b.id;
      } else if (manual) {
        // ES UN INGRESO MANUAL.
        const { serviceIds, customServiceDetail } = manual;
        const customPrice = customServiceDetail ? manual.customServicePrice : 0;

        // Buscar los servicios seleccionados para sumar su precio
        const dbServices = await tx.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, priceAuto: true, duration: true }
        });
        if (dbServices.length !== serviceIds.length) {
          throw new IntakeError("Alguno de los servicios ya no existe. Recarga la página.");
        }

        // Servicios sin precio de catálogo ("a evaluar"): se usa el precio
        // manual ingresado en la recepción, si lo hay. Solo se aceptan para
        // esos servicios; un servicio con precio de catálogo no se pisa.
        const manualPrices: Record<string, number> = {};
        for (const s of dbServices) {
          if (!s.priceAuto && manual.manualPrices[s.id] !== undefined) manualPrices[s.id] = manual.manualPrices[s.id];
        }
        const catalogTotal = dbServices.reduce((acc, s) => acc + (s.priceAuto || manualPrices[s.id] || 0), 0);
        const totalAmount = catalogTotal + customPrice;

        const selectedOptions =
          customServiceDetail || Object.keys(manualPrices).length > 0
            ? {
                ...(customServiceDetail ? { customService: { detail: customServiceDetail, price: customPrice } } : {}),
                ...(Object.keys(manualPrices).length > 0 ? { manualPrices } : {}),
              }
            : undefined;

        // Hora de Chile, no del servidor (UTC). `date` sigue la convención
        // del resto de reservas: el día a las 00:00 UTC.
        const { date: today, time: startTime } = chileNow();
        const duration = dbServices.reduce((acc, s) => acc + s.duration, 0) || 60;
        const endTime = addMinutesToTime(startTime, duration);

        // Crear la reserva interna para que aparezca en la Agenda
        const newBooking = await tx.booking.create({
          data: {
            date: bookingDateFromDay(today),
            startTime,
            endTime,
            status: "CONFIRMED",
            // Entra a la cola del Tablero ("En espera"); se inicia desde ahí.
            workStatus: "PENDING",
            paymentStatus: "PENDING",
            amount: totalAmount,
            totalPrice: totalAmount,
            customerName: d.clientName,
            customerPhone: phone || "",
            customerEmail: email || null,
            vehicleMake: d.make,
            vehicleModel: `${d.model} (Patente: ${plate})`,
            selectedOptions: selectedOptions,
            services: {
              connect: serviceIds.map(id => ({ id }))
            }
          }
        });
        
        bookingId = newBooking.id;
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
    revalidatePath("/admin", "layout");
    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof IntakeError) return fail(error.message);
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    console.error("registerIntake:", error);
    return fail("No se pudo registrar el ingreso.");
  }
}

// La entrega del vehículo (con cobro) vive en actions/workshop.ts (deliverVehicle).

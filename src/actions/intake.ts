"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/staff-session";
import { intakeSchema, manualIntakeServicesSchema, flattenZodError } from "@/lib/validation";
import { normalizePlate, isValidPlate, parseBookingVehicle } from "@/lib/plate";
import { chileNow, bookingDateFromDay, addMinutesToTime } from "@/lib/chile-time";
import { normalizeRut, formatPhone, titleCase } from "@/lib/contact";
import {
  isVehicleType,
  readServiceVariants,
  servicePriceFor,
  vehicleTypeFromMake,
  type VehicleType,
} from "@/lib/booking-constants";
import { totalDuration } from "@/lib/availability";
import { discountAmount, type BookingDiscount } from "@/lib/booking-services";
import { can } from "@/lib/permissions";

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
  vehicle?: {
    id: string;
    plate: string;
    make: string;
    model: string;
    color: string | null;
    /** Tipo para el precio, si se conoce (vehículo del taller o reserva web). */
    vehicleType: VehicleType | null;
  };
  openIntakeId?: string; // si ya hay un ingreso "en taller" para este vehículo
  /** Último kilometraje registrado para este vehículo (cualquier visita). */
  lastOdometer?: { km: number; date: string } | null;
  lastVisit?: string | null;
};

/** Busca un vehículo por patente. Devuelve datos del cliente si existe. */
export async function lookupByPlate(plateRaw: string): Promise<PlateLookup> {
  await requirePermission("intake");

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
          vehicleType: vehicleTypeFromMake(recentBooking.vehicleMake),
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
      vehicleType: isVehicleType(vehicle.vehicleType) ? vehicle.vehicleType : null,
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
  let session;
  try {
    session = await requirePermission("intake");
  } catch {
    return fail("No tienes permiso para registrar ingresos.");
  }

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
    vehicleType: VehicleType;
    serviceIds: string[];
    customServiceDetail?: string;
    customServicePrice: number;
    discountType?: "PERCENT" | "AMOUNT";
    discountValue: number;
    manualPrices: Record<string, number>;
    /** serviceId -> opción elegida (servicios con opciones, ej. Cerámico 2 años). */
    variants: Record<string, string>;
  } | null = null;
  if (!d.bookingId) {
    // Precios manuales: campos "manualPrice:<serviceId>" con valor no vacío.
    const manualPrices: Record<string, number> = {};
    const variants: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("variant:") && typeof value === "string" && value.trim()) {
        variants[key.slice("variant:".length)] = value.trim().slice(0, 120);
        continue;
      }
      if (!key.startsWith("manualPrice:") || typeof value !== "string" || value.trim() === "") continue;
      manualPrices[key.slice("manualPrice:".length)] = Number(value);
    }
    const manualParsed = manualIntakeServicesSchema.safeParse({
      vehicleType: formData.get("vehicleType") ?? "",
      serviceIds: formData.getAll("serviceIds").map(String),
      customServiceDetail: formData.get("customServiceDetail") || undefined,
      customServicePrice: formData.get("customServicePrice") ?? "",
      discountType: formData.get("discountType") || undefined,
      discountValue: formData.get("discountValue") ?? "",
      manualPrices,
    });
    if (!manualParsed.success) return fail(flattenZodError(manualParsed.error));
    manual = { ...manualParsed.data, serviceIds: [...new Set(manualParsed.data.serviceIds)], variants };
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

      // 2. Reserva enlazada (si vino) y tipo de vehículo: de la reserva web,
      // o el elegido en el ingreso sin reserva.
      const linked = d.bookingId
        ? await tx.booking.findUnique({ where: { id: d.bookingId }, select: { id: true, vehicleMake: true } })
        : null;
      if (d.bookingId && !linked) throw new IntakeError("La reserva seleccionada ya no existe. Recarga la página.");
      const vehicleType = manual?.vehicleType ?? (linked ? vehicleTypeFromMake(linked.vehicleMake) : null);

      // 3. Upsert del vehículo por patente (recordando su tipo)
      const vehicle = await tx.vehicle.upsert({
        where: { plate },
        create: { plate, make: d.make, model: d.model, color: d.color, clientId, vehicleType },
        update: { make: d.make, model: d.model, color: d.color, clientId, ...(vehicleType ? { vehicleType } : {}) },
      });

      // 4. Reserva enlazada o cita interna para el ingreso sin reserva
      let bookingId: string | undefined;

      if (linked) {
        bookingId = linked.id;
        // La reserva web queda vinculada al cliente que llegó (historial).
        await tx.booking.update({ where: { id: linked.id }, data: { clientId } });
      } else if (manual) {
        // ES UN INGRESO MANUAL.
        const { serviceIds, customServiceDetail } = manual;
        const customPrice = customServiceDetail ? manual.customServicePrice : 0;

        // Buscar los servicios seleccionados para sumar su precio
        const dbServices = await tx.service.findMany({
          where: { id: { in: serviceIds } },
          select: { id: true, name: true, priceAuto: true, priceSuv2: true, priceSuv3: true, duration: true, variants: true }
        });
        if (dbServices.length !== serviceIds.length) {
          throw new IntakeError("Alguno de los servicios ya no existe. Recarga la página.");
        }

        // Precio de catálogo según el TIPO de vehículo (igual que la web).
        // Servicios sin precio para ese tipo ("a evaluar"): se usa el precio
        // manual ingresado, si lo hay; un precio de catálogo no se pisa.
        // Opciones: igual que en la web, un servicio con opciones exige elegir
        // una (y debe existir); define precio y duración.
        const chosenVariants: Record<string, string> = {};
        for (const s of dbServices) {
          const options = readServiceVariants(s.variants);
          if (options.length === 0) continue;
          const chosen = manual.variants[s.id];
          if (!chosen) throw new IntakeError(`Elige la opción de "${s.name}".`);
          if (!options.some((o) => o.name === chosen)) throw new IntakeError(`La opción elegida de "${s.name}" ya no existe. Recarga la página.`);
          chosenVariants[s.id] = chosen;
        }
        const priceOf = (s: (typeof dbServices)[number]) =>
          servicePriceFor(s, manual!.vehicleType, chosenVariants[s.id]);
        const manualPrices: Record<string, number> = {};
        for (const s of dbServices) {
          if (!priceOf(s) && manual.manualPrices[s.id] !== undefined) manualPrices[s.id] = manual.manualPrices[s.id];
        }
        const catalogTotal = dbServices.reduce((acc, s) => acc + (priceOf(s) || manualPrices[s.id] || 0), 0);
        // Descuento sobre el subtotal (mismo cálculo que el Tablero al
        // reajustar precios, ver localBookingTotal).
        const subtotal = catalogTotal + customPrice;
        const discount: BookingDiscount | null =
          manual.discountType && manual.discountValue > 0
            ? { type: manual.discountType, value: manual.discountValue }
            : null;
        if (discount) {
          if (!can(session, "pricing")) throw new IntakeError("No tienes permiso para aplicar descuentos.");
          if (discount.type === "PERCENT" && discount.value > 100) throw new IntakeError("El descuento no puede superar el 100%.");
          if (discount.type === "AMOUNT" && discount.value > subtotal) {
            throw new IntakeError("El descuento no puede ser mayor que el total de los servicios.");
          }
        }
        const totalAmount = subtotal - discountAmount(discount, subtotal);

        // Misma forma que la reserva web: { [serviceId]: opción } + extras locales.
        const hasOptions =
          customServiceDetail || Object.keys(manualPrices).length > 0 || Object.keys(chosenVariants).length > 0 || discount;
        const selectedOptions = hasOptions
          ? {
              ...chosenVariants,
              ...(customServiceDetail ? { customService: { detail: customServiceDetail, price: customPrice } } : {}),
              ...(Object.keys(manualPrices).length > 0 ? { manualPrices } : {}),
              ...(discount ? { discount } : {}),
            }
          : undefined;

        // Hora de Chile, no del servidor (UTC). `date` sigue la convención
        // del resto de reservas: el día a las 00:00 UTC.
        const { date: today, time: startTime } = chileNow();
        const duration = totalDuration(dbServices, chosenVariants) || 60;
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
            // Misma convención que la reserva web: "<tipo> - <marca>".
            vehicleMake: `${manual.vehicleType} - ${d.make}`,
            clientId,
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

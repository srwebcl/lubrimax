"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/staff-session";
import { updateClientSchema, flattenZodError } from "@/lib/validation";
import { normalizePlate, isValidPlate, formatPlate, parseBookingVehicle } from "@/lib/plate";
import { titleCase, formatPhone, normalizeRut, phoneKey } from "@/lib/contact";
import { realBookingWhere } from "@/lib/booking-constants";
import { bookingServiceNames } from "@/lib/booking-services";

/** Error de negocio con mensaje apto para mostrar al usuario. */
class ClientError extends Error {}

function fail(error: string) {
  return { success: false as const, error };
}

/**
 * Guarda la ficha de un cliente del taller y sus vehículos. Si `id` es
 * "web-<bookingId>" el cliente viene de una reserva web y se consolida como
 * WorkshopClient (reutilizando uno existente con el mismo RUT o correo).
 *
 * Todo corre en una transacción: o se guarda la ficha completa o nada. Una
 * patente que ya pertenece a OTRO cliente se rechaza — antes el upsert por
 * patente la reasignaba en silencio, llevándose el historial de ingresos.
 */
export async function updateClient(id: string, input: unknown) {
  try {
    const session = await requirePermission("clients_edit");

    const parsed = updateClientSchema.safeParse(input);
    if (!parsed.success) return fail(flattenZodError(parsed.error));
    const d = parsed.data;

    const name = titleCase(d.name);
    const phone = formatPhone(d.phone) || null;
    const email = d.email ? d.email.toLowerCase() : null;
    const rut = normalizeRut(d.rut) ?? null;

    const vehicles = new Map<string, { make: string; model: string }>();
    for (const v of d.vehicles) {
      const plate = normalizePlate(v.plate);
      if (!isValidPlate(plate)) return fail(`Patente inválida: "${v.plate}".`);
      if (vehicles.has(plate)) return fail(`La patente ${formatPlate(plate)} está repetida.`);
      vehicles.set(plate, { make: v.make, model: v.model });
    }

    const clientId = await prisma.$transaction(async (tx) => {
      let clientId: string;

      if (id.startsWith("web-")) {
        const booking = await tx.booking.findUnique({
          where: { id: id.slice("web-".length) },
          select: { id: true },
        });
        if (!booking) throw new ClientError("Reserva original no encontrada.");

        // Evitar crear un duplicado en cada "Guardar y consolidar".
        const existing =
          (rut && (await tx.workshopClient.findUnique({ where: { rut } }))) ||
          (email &&
            (await tx.workshopClient.findFirst({
              where: { email: { equals: email, mode: "insensitive" } },
            }))) ||
          null;

        if (existing) {
          clientId = existing.id;
          await tx.workshopClient.update({
            where: { id: clientId },
            data: { name, phone: phone ?? existing.phone, email: email ?? existing.email, rut: rut ?? existing.rut },
          });
        } else {
          clientId = (
            await tx.workshopClient.create({
              data: { name, phone, email, rut, createdByStaffId: session.userId },
            })
          ).id;
        }
      } else {
        const current = await tx.workshopClient.findUnique({ where: { id }, select: { id: true } });
        if (!current) throw new ClientError("Cliente no encontrado.");
        clientId = id;

        if (rut) {
          const rutOwner = await tx.workshopClient.findUnique({ where: { rut }, select: { id: true, name: true } });
          if (rutOwner && rutOwner.id !== clientId) {
            throw new ClientError(`El RUT ${rut} ya pertenece a otro cliente (${rutOwner.name}).`);
          }
        }

        await tx.workshopClient.update({ where: { id: clientId }, data: { name, phone, email, rut } });
      }

      // Patentes de otros clientes: no se reasignan desde la ficha.
      const taken = await tx.vehicle.findFirst({
        where: { plate: { in: [...vehicles.keys()] }, clientId: { not: clientId } },
        include: { client: { select: { name: true } } },
      });
      if (taken) {
        throw new ClientError(
          `La patente ${formatPlate(taken.plate)} ya está registrada a nombre de ${taken.client.name}. ` +
            "Si cambió de dueño, regístrala desde Ingreso con los datos del nuevo cliente."
        );
      }

      // Vehículos quitados de la ficha: solo se borran si no tienen historial.
      const owned = await tx.vehicle.findMany({
        where: { clientId },
        select: { id: true, plate: true, _count: { select: { intakes: true } } },
      });
      const removed = owned.filter((v) => !vehicles.has(v.plate));
      const withHistory = removed.find((v) => v._count.intakes > 0);
      if (withHistory) {
        throw new ClientError(
          `No se puede quitar la patente ${formatPlate(withHistory.plate)} porque tiene historial de ingresos en el taller.`
        );
      }
      if (removed.length > 0) {
        await tx.vehicle.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });
      }

      for (const [plate, v] of vehicles) {
        await tx.vehicle.upsert({
          where: { plate },
          update: { make: v.make, model: v.model },
          create: { plate, make: v.make, model: v.model, clientId },
        });
      }

      return clientId;
    });

    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${clientId}`);
    return { success: true as const, clientId };
  } catch (error) {
    if (error instanceof ClientError) return fail(error.message);
    if (error instanceof Error && error.message === "No autorizado.") return fail("No autorizado.");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Ya existe otro cliente o vehículo con esos datos (RUT o patente).");
    }
    console.error("Error updating client:", error);
    return fail("No se pudo actualizar el cliente.");
  }
}

export type ClientHistoryItem = {
  id: string;
  date: Date;
  type: string;
  plate: string;
  vehicle: string;
  services: string[];
  amount: number | null;
  notes: string | null;
  odometer: number | null;
};

/** Formatos en que puede estar guardado un mismo celular chileno. */
function phoneVariants(phone: string | null) {
  const key = phoneKey(phone);
  if (!key) return [];
  const variants = new Set([key, `56${key}`, `+56${key}`, formatPhone(key)]);
  if (phone) variants.add(phone);
  return [...variants];
}

type BookingWithServices = {
  id: string;
  createdAt: Date;
  vehicleMake: string;
  vehicleModel: string;
  amount: number | null;
  selectedOptions: Prisma.JsonValue;
  services: { name: string }[];
};


function bookingItem(b: BookingWithServices, type: string): ClientHistoryItem {
  const v = parseBookingVehicle(b.vehicleMake, b.vehicleModel);
  return {
    id: b.id,
    date: b.createdAt,
    type,
    plate: v.plate,
    vehicle: `${v.make} ${v.model}`.trim(),
    services: bookingServiceNames(b),
    amount: b.amount,
    notes: null,
    odometer: null,
  };
}

/**
 * Historial de reservas e ingresos de un cliente. Excluye reservas
 * canceladas y pagos abandonados (ver realBookingWhere).
 */
export async function getClientHistory(clientId: string): Promise<ClientHistoryItem[]> {
  try {
    await requirePermission("clients_view");

    const bookingInclude = { services: { select: { name: true } } } as const;

    if (clientId.startsWith("web-")) {
      const booking = await prisma.booking.findFirst({
        where: { id: clientId.slice("web-".length), ...realBookingWhere() },
        include: bookingInclude,
      });
      return booking ? [bookingItem(booking, "Reserva Web")] : [];
    }

    const client = await prisma.workshopClient.findUnique({
      where: { id: clientId },
      include: {
        vehicles: {
          include: {
            intakes: {
              include: { booking: { include: bookingInclude } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });
    if (!client) return [];

    const history = new Map<string, ClientHistoryItem>();

    // 1. Reservas que coinciden por teléfono (cualquier formato), correo o patente.
    const plates = client.vehicles.map((v) => v.plate);
    const or: Prisma.BookingWhereInput[] = [
      ...phoneVariants(client.phone).map((p) => ({ customerPhone: p })),
      ...(client.email ? [{ customerEmail: { equals: client.email, mode: "insensitive" as const } }] : []),
      ...plates.map((p) => ({ vehicleModel: { contains: `(Patente: ${p})` } })),
    ];
    if (or.length > 0) {
      const bookings = await prisma.booking.findMany({
        where: { AND: [{ OR: or }, realBookingWhere()] },
        include: bookingInclude,
        take: 200,
        orderBy: { createdAt: "desc" },
      });
      for (const b of bookings) history.set(`booking-${b.id}`, bookingItem(b, "Reserva"));
    }

    // 2. Ingresos al taller: reemplazan a la reserva enlazada (tienen más datos).
    for (const v of client.vehicles) {
      for (const intake of v.intakes) {
        const linked = intake.booking && intake.booking.status !== "CANCELLED" ? intake.booking : null;
        if (intake.bookingId) history.delete(`booking-${intake.bookingId}`);
        history.set(`intake-${intake.id}`, {
          id: intake.id,
          date: intake.createdAt,
          type: "Ingreso a Taller",
          plate: v.plate,
          vehicle: `${v.make} ${v.model}`,
          services: linked ? bookingServiceNames(linked) : ["Ingreso Manual (Sin Reserva)"],
          amount: linked?.amount ?? null,
          notes: intake.notes,
          odometer: intake.odometer,
        });
      }
    }

    return [...history.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    console.error("Error fetching client history:", error);
    return [];
  }
}

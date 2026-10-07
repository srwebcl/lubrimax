"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requirePermission, requireRole } from "@/lib/staff-session";
import { updateClientSchema, flattenZodError } from "@/lib/validation";
import { normalizePlate, isValidPlate, formatPlate, parseBookingVehicle } from "@/lib/plate";
import { titleCase, formatPhone, normalizeRut, phoneKey } from "@/lib/contact";
import { realBookingWhere } from "@/lib/booking-constants";
import { bookingMoney } from "@/lib/booking-money";
import { bookingDateFromDay, chileNow } from "@/lib/chile-time";
import { webPersonKey } from "@/lib/client-identity";
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

    let webSource: { customerName: string; customerPhone: string; customerEmail: string | null } | null = null;
    const clientId = await prisma.$transaction(async (tx) => {
      let clientId: string;

      if (id.startsWith("web-")) {
        const booking = await tx.booking.findUnique({
          where: { id: id.slice("web-".length) },
          select: { id: true, customerName: true, customerPhone: true, customerEmail: true },
        });
        if (!booking) throw new ClientError("Reserva original no encontrada.");
        webSource = booking;

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

      // Cliente web consolidado: sus reservas web (misma persona) quedan
      // vinculadas a la ficha, para que el historial las muestre.
      if (webSource) {
        const key = webPersonKey(webSource);
        const candidates = await tx.booking.findMany({
          where: { clientId: null },
          select: { id: true, customerName: true, customerPhone: true, customerEmail: true },
          take: 3000,
        });
        const ids = candidates.filter((b) => webPersonKey(b) === key).map((b) => b.id);
        if (ids.length > 0) await tx.booking.updateMany({ where: { id: { in: ids } }, data: { clientId } });
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
  /** Día ("YYYY-MM-DD") y hora ("HH:mm") de la ATENCIÓN (no de cuando se reservó). */
  day: string;
  time: string | null;
  /** Para ordenar: minutos desde época. */
  sortKey: number;
  /** "Reserva web" | "Atención en local" | "Ingreso". */
  origin: string;
  /** attended = vino al taller; upcoming = reserva futura; booked = reserva pasada sin ingreso registrado. */
  status: "attended" | "upcoming" | "booked";
  plate: string;
  vehicle: string;
  services: string[];
  total: number | null;
  paid: number | null;
  balance: number | null;
  notes: string | null;
  odometer: number | null;
};

const historyBookingInclude = {
  services: { select: { id: true, name: true } },
  payments: { select: { amount: true, method: true } },
  intakes: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    include: { vehicle: { select: { plate: true, make: true, model: true } } },
  },
} as const;

type HistoryBooking = Prisma.BookingGetPayload<{ include: typeof historyBookingInclude }>;

function sortKeyOf(day: string, time: string | null) {
  const [h, m] = (time ?? "00:00").split(":").map(Number);
  return Math.floor(Date.parse(`${day}T00:00:00.000Z`) / 60000) + h * 60 + m;
}

/** Una reserva (con su ingreso, si llegó) como fila del historial. */
function bookingHistoryItem(b: HistoryBooking, today: string): ClientHistoryItem {
  const intake = b.intakes[0];
  const v = parseBookingVehicle(b.vehicleMake, b.vehicleModel);
  const money = bookingMoney(b);
  const bookedDay = b.date.toISOString().substring(0, 10);
  const at = intake ? chileNow(intake.createdAt) : null;
  const day = at?.date ?? bookedDay;
  const time = at?.time ?? b.startTime;
  return {
    id: b.id,
    day,
    time,
    sortKey: sortKeyOf(day, time),
    origin: b.paymentType ? "Reserva web" : "Atención en local",
    status: intake ? "attended" : bookedDay >= today ? "upcoming" : "booked",
    plate: intake?.vehicle.plate ?? v.plate,
    vehicle: intake ? `${intake.vehicle.make} ${intake.vehicle.model}` : `${v.make} ${v.model}`.trim(),
    services: bookingServiceNames(b),
    total: money.total || null,
    paid: money.paid,
    balance: money.balance,
    notes: intake?.notes ?? null,
    odometer: intake?.odometer ?? null,
  };
}

/**
 * Historial de un cliente: SOLO lo que le pertenece de forma explícita.
 *  - Cliente del taller: reservas vinculadas (Booking.clientId) + ingresos
 *    de sus vehículos.
 *  - Cliente web (aún no consolidado): sus reservas web, agrupadas por
 *    persona (nombre + teléfono/correo, ver client-identity.ts).
 * Ya NO se buscan reservas por correo/teléfono sueltos: se repetían entre
 * personas distintas y mezclaban historiales, montos y patentes ajenas.
 * Excluye canceladas, "no vino" y pagos abandonados (realBookingWhere).
 */
export async function getClientHistory(clientId: string): Promise<ClientHistoryItem[]> {
  try {
    await requirePermission("clients_view");
    const today = chileNow().date;
    const items: ClientHistoryItem[] = [];

    if (clientId.startsWith("web-")) {
      const source = await prisma.booking.findUnique({
        where: { id: clientId.slice("web-".length) },
        select: { customerName: true, customerPhone: true, customerEmail: true },
      });
      if (!source) return [];
      const key = webPersonKey(source);
      const candidates = await prisma.booking.findMany({
        where: { AND: [{ clientId: null }, realBookingWhere()] },
        include: historyBookingInclude,
        orderBy: { createdAt: "desc" },
        take: 3000,
      });
      for (const b of candidates) if (webPersonKey(b) === key) items.push(bookingHistoryItem(b, today));
      return items.sort((a, b) => b.sortKey - a.sortKey);
    }

    const [bookings, orphanIntakes] = await Promise.all([
      prisma.booking.findMany({
        where: { AND: [{ clientId }, realBookingWhere()] },
        include: historyBookingInclude,
        orderBy: { date: "desc" },
        take: 300,
      }),
      // Ingresos antiguos sin reserva asociada (anteriores a la cita automática).
      prisma.vehicleIntake.findMany({
        where: { bookingId: null, vehicle: { clientId } },
        include: { vehicle: { select: { plate: true, make: true, model: true } } },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
    ]);

    for (const b of bookings) items.push(bookingHistoryItem(b, today));
    for (const i of orphanIntakes) {
      const at = chileNow(i.createdAt);
      items.push({
        id: i.id,
        day: at.date,
        time: at.time,
        sortKey: sortKeyOf(at.date, at.time),
        origin: "Ingreso",
        status: "attended",
        plate: i.vehicle.plate,
        vehicle: `${i.vehicle.make} ${i.vehicle.model}`,
        services: ["Sin detalle de servicios"],
        total: null,
        paid: null,
        balance: null,
        notes: i.notes,
        odometer: i.odometer,
      });
    }

    return items.sort((a, b) => b.sortKey - a.sortKey);
  } catch (error) {
    console.error("Error fetching client history:", error);
    return [];
  }
}

// ── Borrado de clientes (solo ADMIN) ──

type DeletionScope = {
  name: string;
  clientId: string | null;
  bookingIds: string[];
  vehicleIds: string[];
  intakeIds: string[];
  /** Reserva confirmada futura que aún no llega: bloquea el borrado. */
  upcoming: { day: string; time: string } | null;
};

/**
 * Todo lo que pertenece a un cliente del directorio. Cliente del taller:
 * ficha + vehículos + ingresos + reservas vinculadas. Cliente web: todas las
 * reservas de esa persona (nombre + teléfono/correo) aún sin ficha.
 */
async function deletionScope(id: string): Promise<DeletionScope | null> {
  const today = chileNow().date;
  let name: string;
  let clientId: string | null = null;
  let vehicleIds: string[] = [];
  let intakeIds: string[] = [];
  let bookingIds: string[];

  if (id.startsWith("web-")) {
    const source = await prisma.booking.findUnique({
      where: { id: id.slice("web-".length) },
      select: { customerName: true, customerPhone: true, customerEmail: true },
    });
    if (!source) return null;
    name = source.customerName;
    const key = webPersonKey(source);
    const candidates = await prisma.booking.findMany({
      where: { clientId: null },
      select: { id: true, customerName: true, customerPhone: true, customerEmail: true },
      take: 5000,
    });
    bookingIds = candidates.filter((b) => webPersonKey(b) === key).map((b) => b.id);
  } else {
    const client = await prisma.workshopClient.findUnique({
      where: { id },
      include: { vehicles: { include: { intakes: { select: { id: true, bookingId: true } } } } },
    });
    if (!client) return null;
    name = client.name;
    clientId = client.id;
    vehicleIds = client.vehicles.map((v) => v.id);
    const intakes = client.vehicles.flatMap((v) => v.intakes);
    intakeIds = intakes.map((i) => i.id);
    const linked = await prisma.booking.findMany({
      where: {
        OR: [
          { clientId: client.id },
          // Citas de sus ingresos que no quedaron vinculadas a otro cliente.
          { id: { in: intakes.map((i) => i.bookingId).filter((b): b is string => !!b) }, clientId: null },
        ],
      },
      select: { id: true },
    });
    bookingIds = linked.map((b) => b.id);
  }

  const next = await prisma.booking.findFirst({
    where: {
      id: { in: bookingIds },
      status: "CONFIRMED",
      date: { gte: bookingDateFromDay(today) },
      intakes: { none: {} },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: { date: true, startTime: true },
  });

  return {
    name,
    clientId,
    bookingIds,
    vehicleIds,
    intakeIds,
    upcoming: next ? { day: next.date.toISOString().substring(0, 10), time: next.startTime } : null,
  };
}

/** Lo que se borraría (para mostrarlo antes de confirmar). */
export async function getClientDeletionImpact(id: string) {
  try {
    await requireRole("ADMIN");
    const scope = await deletionScope(id);
    if (!scope) return fail("Cliente no encontrado.");
    return {
      success: true as const,
      name: scope.name,
      vehicles: scope.vehicleIds.length,
      visits: scope.intakeIds.length,
      bookings: scope.bookingIds.length,
      upcoming: scope.upcoming,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("Solo el administrador puede borrar clientes.");
    console.error("getClientDeletionImpact:", error);
    return fail("No se pudo revisar el cliente.");
  }
}

/**
 * Borra un cliente y TODO su historial (irreversible). No borra si tiene una
 * reserva próxima: hay que cancelarla primero desde la Agenda, para que no
 * desaparezca de la agenda alguien que va a llegar.
 */
export async function deleteClient(id: string) {
  try {
    const session = await requireRole("ADMIN");
    const scope = await deletionScope(id);
    if (!scope) return fail("Cliente no encontrado.");
    if (scope.upcoming) {
      const [y, m, d] = scope.upcoming.day.split("-");
      return fail(
        `Tiene una reserva próxima (${d}/${m}/${y} ${scope.upcoming.time}). Cancélala primero desde la Agenda.`
      );
    }

    await prisma.$transaction([
      prisma.bookingActivityLog.deleteMany({ where: { bookingId: { in: scope.bookingIds } } }),
      prisma.vehicleIntake.deleteMany({ where: { id: { in: scope.intakeIds } } }),
      prisma.booking.deleteMany({ where: { id: { in: scope.bookingIds } } }), // pagos en cascada
      prisma.vehicle.deleteMany({ where: { id: { in: scope.vehicleIds } } }),
      ...(scope.clientId ? [prisma.workshopClient.delete({ where: { id: scope.clientId } })] : []),
    ]);

    console.info(
      `deleteClient: ${session.name} borró a "${scope.name}" (${scope.bookingIds.length} reservas, ${scope.intakeIds.length} ingresos, ${scope.vehicleIds.length} vehículos)`
    );
    revalidatePath("/admin", "layout");
    return { success: true as const };
  } catch (error) {
    if (error instanceof Error && error.message === "No autorizado.") return fail("Solo el administrador puede borrar clientes.");
    console.error("deleteClient:", error);
    return fail("No se pudo borrar el cliente.");
  }
}

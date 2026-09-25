import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-session";
import { lookupByPlate, type PlateLookup } from "@/actions/intake";
import IntakeConsole from "./IntakeConsole";
import { chileTodayRange } from "@/lib/chile-time";
import { parseBookingVehicle } from "@/lib/plate";

export const metadata = { title: "Ingreso de vehículos | Lubrimax" };
export const dynamic = "force-dynamic";

// Formulario de recepción. Se llega desde el Tablero del Taller:
//  - "Llegó" en una reserva web → /admin/ingreso?reserva=<id> (datos precargados)
//  - "Llegó sin reserva"        → /admin/ingreso (búsqueda por patente)
export default async function IntakePage(props: { searchParams: Promise<{ reserva?: string }> }) {
  await requireStaffPage();
  const { reserva } = await props.searchParams;

  // "Hoy" en Chile: el servidor corre en UTC y desde las 20/21 h ya sería mañana.
  const { start, end } = chileTodayRange();

  const [todayBookings, services, preBooking] = await Promise.all([
    // Reservas de hoy que todavía no llegan (para vincular a mano).
    prisma.booking.findMany({
      where: { date: { gte: start, lt: end }, status: "CONFIRMED", intakes: { none: {} } },
      orderBy: { startTime: "asc" },
      select: { id: true, startTime: true, customerName: true, vehicleMake: true, vehicleModel: true },
    }),
    prisma.service.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, priceAuto: true, category: true },
    }),
    reserva
      ? prisma.booking.findFirst({
          where: { id: reserva, status: "CONFIRMED", intakes: { none: {} } },
          select: {
            id: true,
            startTime: true,
            customerName: true,
            customerPhone: true,
            customerEmail: true,
            vehicleMake: true,
            vehicleModel: true,
          },
        })
      : null,
  ]);

  // Llegada de una reserva: se precarga la patente y, si el vehículo ya es
  // conocido, sus datos; si no, los de la reserva.
  let initial: { bookingId: string; plate: string; lookup: PlateLookup } | undefined;
  if (preBooking) {
    const v = parseBookingVehicle(preBooking.vehicleMake, preBooking.vehicleModel);
    const known = v.plate ? await lookupByPlate(v.plate) : { found: false };
    initial = {
      bookingId: preBooking.id,
      plate: v.plate,
      lookup: known.found
        ? known
        : {
            found: false,
            client: {
              id: "",
              name: preBooking.customerName,
              rut: null,
              phone: preBooking.customerPhone,
              email: preBooking.customerEmail,
            },
            vehicle: { id: "", plate: v.plate, make: v.make, model: v.model, color: null },
          },
    };
    if (!todayBookings.some((b) => b.id === preBooking.id)) todayBookings.unshift(preBooking);
  }

  return (
    <div className="px-4 sm:px-6 py-4 max-w-2xl mx-auto w-full space-y-4">
      <header>
        <h1 className="text-[22px] leading-tight font-bold tracking-tight text-white">
          {initial ? "Recepción de reserva" : "Ingreso sin reserva"}
        </h1>
        <p className="text-sm text-gray-500">
          {initial
            ? `Reserva de ${preBooking!.customerName} a las ${preBooking!.startTime}. Revisa los datos y registra la llegada.`
            : "Registra el auto por patente al llegar al local."}
        </p>
      </header>
      <IntakeConsole todayBookings={todayBookings} services={services} initial={initial} />
    </div>
  );
}

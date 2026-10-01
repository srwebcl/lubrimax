import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-session";
import BookingsManager from "./BookingsManager";
import { chileTodayRange } from "@/lib/chile-time";
import { customServiceDetail } from "@/lib/booking-services";

const AGENDA_PAST_DAYS = 60;
const AGENDA_MAX_ROWS = 500;

function agendaWhere() {
  const { start: today } = chileTodayRange();
  return {
    date: { gte: new Date(today.getTime() - AGENDA_PAST_DAYS * 86_400_000) },
    NOT: { status: "PENDING", paymentStatus: "PENDING", createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  };
}

export const metadata = {
  title: "Agenda | Lubrimax",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const { role } = await requireStaffPage();

  // Ventana acotada: antes se cargaban TODAS las reservas históricas en cada
  // visita (y se mandaban al navegador), lo que crece sin límite. Se muestran
  // los últimos AGENDA_PAST_DAYS días más todo lo futuro, sin los pagos
  // abandonados (PENDING sin pagar de hace más de 24 h).
  const bookings = await prisma.booking.findMany({
    where: agendaWhere(),
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    include: { services: { select: { name: true, duration: true } } },
    take: AGENDA_MAX_ROWS,
  });

  // Qué reservas ya tienen el vehículo ingresado al taller (para el badge).
  const arrived = new Set(
    (
      await prisma.vehicleIntake.findMany({
        where: { status: "IN_SHOP", bookingId: { in: bookings.map((b) => b.id) } },
        select: { bookingId: true },
      })
    )
      .map((i) => i.bookingId)
      .filter((id): id is string => !!id)
  );

  return (
    <div className="px-4 sm:px-6 py-4 max-w-3xl mx-auto w-full space-y-1">
      <header className="pb-1">
        <h1 className="text-[22px] leading-tight font-bold tracking-tight text-white">Agenda</h1>
        <p className="text-sm text-gray-500">
          {role === "ADMIN" ? "Reservas y avance de los trabajos." : "Marca el avance de cada trabajo."}{" "}
          <span className="text-gray-600">Últimos {AGENDA_PAST_DAYS} días y próximas.</span>
        </p>
      </header>
      <BookingsManager
        role={role}
        initialBookings={bookings.map((b) => {
          const srvs = b.services.map((s) => ({ name: s.name, duration: s.duration }));
          // Servicio personalizado del ingreso sin reserva.
          const custom = customServiceDetail(b.selectedOptions);
          if (custom) srvs.push({ name: `[Personalizado] ${custom}`, duration: 0 });

          return {
            id: b.id,
            date: b.date.toISOString(),
            startTime: b.startTime,
            endTime: b.endTime,
            status: b.status,
            workStatus: b.workStatus,
            paymentStatus: b.paymentStatus,
            arrived: arrived.has(b.id),
            customerName: b.customerName,
            customerPhone: b.customerPhone,
            customerEmail: b.customerEmail,
            vehicleMake: b.vehicleMake,
            vehicleModel: b.vehicleModel,
            services: srvs,
          };
        })}
      />
    </div>
  );
}

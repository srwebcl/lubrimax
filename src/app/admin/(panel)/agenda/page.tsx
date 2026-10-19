import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-session";
import { can } from "@/lib/permissions";
import { bookingMoney } from "@/lib/booking-money";
import { ON_SITE_PAYMENT } from "@/lib/booking-constants";
import BookingsManager from "./BookingsManager";
import { chileTodayRange } from "@/lib/chile-time";
import { customServiceDetail, selectedVariantOf } from "@/lib/booking-services";

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
  const session = await requireStaffPage("agenda");
  const { role } = session;

  // Ventana acotada: antes se cargaban TODAS las reservas históricas en cada
  // visita (y se mandaban al navegador), lo que crece sin límite. Se muestran
  // los últimos AGENDA_PAST_DAYS días más todo lo futuro, sin los pagos
  // abandonados (PENDING sin pagar de hace más de 24 h).
  const bookings = await prisma.booking.findMany({
    where: agendaWhere(),
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    include: {
      services: { select: { id: true, name: true, duration: true } },
      payments: { select: { amount: true, method: true } },
    },
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
      <header className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-[22px] leading-tight font-bold tracking-tight text-white">Agenda</h1>
          <p className="text-sm text-gray-500">
            {role === "ADMIN" ? "Reservas y avance de los trabajos." : "Marca el avance de cada trabajo."}{" "}
            <span className="text-gray-600">Últimos {AGENDA_PAST_DAYS} días y próximas.</span>
          </p>
        </div>
        {role === "ADMIN" && (
          <Link
            href="/admin/estadisticas"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/25 transition-all self-start sm:self-auto shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Historial de Servicios →
          </Link>
        )}
      </header>
      <BookingsManager
        role={role}
        canWork={can(session, "work")}
        initialBookings={bookings.map((b) => {
          // Con la opción elegida (ej. "Detailing Exterior · Cerámico (2 años)").
          const srvs = b.services.map((s) => {
            const variant = selectedVariantOf(b.selectedOptions, s.id);
            return { name: variant ? `${s.name} · ${variant}` : s.name, duration: s.duration };
          });
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
            // Saldo real (total - pagos): "Pagada" o "Por pagar $X".
            balance: bookingMoney(b).balance,
            webOnSite: b.paymentType === ON_SITE_PAYMENT,
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

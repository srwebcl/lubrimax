import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-session";
import { chileNow } from "@/lib/chile-time";
import { getServicesHistory, getServicesHistoryFilterOptions } from "@/actions/admin-history";
import EstadisticasTabs from "./EstadisticasTabs";

export const metadata = {
  title: "Historial de Servicios y Estadísticas | Lubrimax",
};

export const dynamic = "force-dynamic";

export default async function EstadisticasPage() {
  await requireStaffPage("ADMIN");

  // Primer día del mes en Chile, en la convención de Booking.date (00:00 UTC).
  const firstDayOfMonth = new Date(`${chileNow().date.slice(0, 7)}-01T00:00:00.000Z`);
  // Para timestamps reales (createdAt de pagos): 00:00 de Chile ≈ 04:00 UTC.
  const monthStartInstant = new Date(firstDayOfMonth.getTime() + 4 * 60 * 60 * 1000);

  // 1. Cargar opciones de filtros e historial inicial
  const [filterOptions, initialHistory, completedJobsThisMonth, paymentsByMethod, legacyWebpay, intakesThisMonth] =
    await Promise.all([
      getServicesHistoryFilterOptions(),
      getServicesHistory({ periodPreset: "this_month" }),
      prisma.booking.count({
        where: {
          workStatus: "DONE",
          date: { gte: firstDayOfMonth },
        },
      }),
      prisma.bookingPayment.groupBy({
        by: ["method"],
        where: { createdAt: { gte: monthStartInstant } },
        _sum: { amount: true },
      }),
      prisma.booking.aggregate({
        where: {
          createdAt: { gte: monthStartInstant },
          paymentType: { not: null },
          paymentStatus: { in: ["PAID_RESERVATION", "PAID_FULL"] },
          payments: { none: {} },
        },
        _sum: { amount: true },
      }),
      prisma.vehicleIntake.count({
        where: { createdAt: { gte: firstDayOfMonth } },
      }),
    ]);

  const incomeMap = new Map<string, number>();
  for (const p of paymentsByMethod) incomeMap.set(p.method, p._sum.amount ?? 0);
  const legacy = legacyWebpay._sum.amount ?? 0;
  if (legacy > 0) incomeMap.set("WEBPAY", (incomeMap.get("WEBPAY") ?? 0) + legacy);
  const totalIncome = [...incomeMap.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="px-4 sm:px-6 py-5 max-w-6xl mx-auto w-full space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-[22px] leading-tight font-bold tracking-tight text-white">
            Historial de Servicios y Estadísticas
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Consulta los servicios realizados por mes, por tipo de trabajo y analiza el rendimiento del taller.
          </p>
        </div>
      </header>

      <EstadisticasTabs
        initialHistory={initialHistory}
        availableMonths={filterOptions.months}
        availableServices={filterOptions.services}
        completedJobsThisMonth={completedJobsThisMonth}
        totalIncome={totalIncome}
        incomeByMethod={[...incomeMap.entries()]}
        intakesThisMonth={intakesThisMonth}
      />
    </div>
  );
}

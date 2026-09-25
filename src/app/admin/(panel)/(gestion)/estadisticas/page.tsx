import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-session";
import { chileNow } from "@/lib/chile-time";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/booking-money";

export const metadata = {
  title: "Estadísticas | Lubrimax",
};

export const dynamic = "force-dynamic";

export default async function EstadisticasPage() {
  await requireStaffPage("ADMIN");

  // Primer día del mes en Chile, en la convención de Booking.date (00:00 UTC).
  const firstDayOfMonth = new Date(`${chileNow().date.slice(0, 7)}-01T00:00:00.000Z`);
  // Para timestamps reales (createdAt de pagos): 00:00 de Chile ≈ 04:00 UTC.
  const monthStartInstant = new Date(firstDayOfMonth.getTime() + 4 * 60 * 60 * 1000);

  // 1. Total de trabajos terminados este mes
  const completedJobsThisMonth = await prisma.booking.count({
    where: {
      workStatus: "DONE",
      date: { gte: firstDayOfMonth }
    }
  });

  // 2. Ingresos del mes: pagos registrados (Webpay + cobros en el local).
  const paymentsByMethod = await prisma.bookingPayment.groupBy({
    by: ["method"],
    where: { createdAt: { gte: monthStartInstant } },
    _sum: { amount: true },
  });
  // Reservas web pagadas antes de que existiera el registro de pagos.
  const legacyWebpay = await prisma.booking.aggregate({
    where: {
      createdAt: { gte: monthStartInstant },
      paymentType: { not: null },
      paymentStatus: { in: ["PAID_RESERVATION", "PAID_FULL"] },
      payments: { none: {} },
    },
    _sum: { amount: true },
  });

  const incomeByMethod = new Map<string, number>();
  for (const p of paymentsByMethod) incomeByMethod.set(p.method, p._sum.amount ?? 0);
  const legacy = legacyWebpay._sum.amount ?? 0;
  if (legacy > 0) incomeByMethod.set("WEBPAY", (incomeByMethod.get("WEBPAY") ?? 0) + legacy);
  const totalIncome = [...incomeByMethod.values()].reduce((a, b) => a + b, 0);

  // 3. Cantidad de autos físicos ingresados al taller
  const intakesThisMonth = await prisma.vehicleIntake.count({
    where: { createdAt: { gte: firstDayOfMonth } }
  });

  return (
    <div className="px-4 sm:px-6 py-4 max-w-4xl mx-auto w-full space-y-6">
      <header>
        <h1 className="text-[22px] leading-tight font-bold tracking-tight text-white">Estadísticas</h1>
        <p className="text-sm text-gray-500">Métricas y datos históricos de operación del mes actual.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-center">
          <div className="text-sm font-semibold text-gray-400 mb-1">Trabajos Terminados</div>
          <div className="text-3xl font-black text-brand-cyan">{completedJobsThisMonth}</div>
          <div className="text-xs text-gray-600 mt-2">Reservas marcadas como listas</div>
        </div>

        <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-center">
          <div className="text-sm font-semibold text-gray-400 mb-1">Ingresos del mes</div>
          <div className="text-3xl font-black text-green-400">
            ${totalIncome.toLocaleString("es-CL")}
          </div>
          <div className="text-xs text-gray-600 mt-2 space-y-0.5">
            {incomeByMethod.size === 0
              ? "Sin pagos registrados este mes"
              : [...incomeByMethod].map(([method, amount]) => (
                  <div key={method} className="flex justify-between gap-2">
                    <span>{PAYMENT_METHODS[method as PaymentMethod] ?? method}</span>
                    <span className="text-gray-400">${amount.toLocaleString("es-CL")}</span>
                  </div>
                ))}
          </div>
        </div>

        <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-center">
          <div className="text-sm font-semibold text-gray-400 mb-1">Vehículos Recibidos</div>
          <div className="text-3xl font-black text-white">{intakesThisMonth}</div>
          <div className="text-xs text-gray-600 mt-2">Registrados en recepción</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-2">Acerca del Registro</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Toda la información operativa (servicios agendados, trabajos terminados, recepción de vehículos) se almacena permanentemente en la base de datos de Lubrimax de forma automática. Aunque una reserva desaparezca de la pestaña "Pendientes" al ser terminada, sus datos persisten para el historial del negocio y pueden ser analizados aquí.
        </p>
      </div>
    </div>
  );
}

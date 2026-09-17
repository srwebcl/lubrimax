import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Estadísticas | Lubrimax",
};

export const dynamic = "force-dynamic";

export default async function EstadisticasPage() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Total de trabajos terminados este mes
  const completedJobsThisMonth = await prisma.booking.count({
    where: {
      workStatus: "DONE",
      date: { gte: firstDayOfMonth }
    }
  });

  // 2. Ingresos proyectados vs pagados de las reservas (mes actual)
  const bookingsThisMonth = await prisma.booking.findMany({
    where: { date: { gte: firstDayOfMonth }, status: { not: "CANCELLED" } },
    select: { amount: true, paymentStatus: true }
  });

  let totalIncome = 0;
  bookingsThisMonth.forEach(b => {
    if (b.paymentStatus === "PAID_FULL" || b.paymentStatus === "PAID_RESERVATION") {
      totalIncome += b.amount || 0;
    }
  });

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
          <div className="text-sm font-semibold text-gray-400 mb-1">Ingresos de Reservas</div>
          <div className="text-3xl font-black text-green-400">
            ${totalIncome.toLocaleString("es-CL")}
          </div>
          <div className="text-xs text-gray-600 mt-2">Abonado/Pagado vía Webpay</div>
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

import { prisma } from "@/lib/prisma";
import { getShopStatus } from "@/actions/intake";
import IntakeConsole from "./IntakeConsole";

export const metadata = { title: "Ingreso de vehículos | Lubrimax" };
export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [inShop, todayBookings] = await Promise.all([
    getShopStatus(),
    prisma.booking.findMany({
      where: { date: { gte: start, lt: end }, status: { not: "CANCELLED" } },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        customerName: true,
        vehicleMake: true,
        vehicleModel: true,
      },
    }),
  ]);

  return (
    <div className="px-4 sm:px-6 py-4 max-w-2xl mx-auto w-full space-y-4">
      <header>
        <h1 className="text-[22px] leading-tight font-bold tracking-tight text-white">Ingreso de vehículos</h1>
        <p className="text-sm text-gray-500">Registra el auto por patente al llegar al taller.</p>
      </header>
      <IntakeConsole inShop={inShop} todayBookings={todayBookings} />
    </div>
  );
}

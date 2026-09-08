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
    <div className="px-3 sm:px-6 py-4 max-w-2xl mx-auto w-full">
      <IntakeConsole inShop={inShop} todayBookings={todayBookings} />
    </div>
  );
}

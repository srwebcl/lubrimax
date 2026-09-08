import { prisma } from "@/lib/prisma";
import { verifyStaffSession } from "@/lib/staff-session";
import BookingsManager from "./BookingsManager";

export const metadata = {
  title: "Agenda | Lubrimax",
};

export default async function AdminDashboard() {
  const session = await verifyStaffSession();
  const role = session?.role ?? "WORKER";

  const bookings = await prisma.booking.findMany({
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    include: { services: true },
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
          {role === "ADMIN" ? "Reservas y avance de los trabajos." : "Marca el avance de cada trabajo."}
        </p>
      </header>
      <BookingsManager
        role={role}
        initialBookings={bookings.map((b) => ({
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
          services: b.services.map((s) => ({ name: s.name, duration: s.duration })),
        }))}
      />
    </div>
  );
}

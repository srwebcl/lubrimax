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

  return (
    <div className="px-3 sm:px-6 py-4 max-w-5xl mx-auto w-full">
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

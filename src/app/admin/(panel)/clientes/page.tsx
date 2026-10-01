import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-session";
import { realBookingWhere } from "@/lib/booking-constants";
import { parseBookingVehicle } from "@/lib/plate";
import { phoneKey } from "@/lib/contact";
import ClientManager, { type UnifiedClient } from "./ClientManager";

export const metadata = {
  title: "Clientes | Lubrimax",
};

export const dynamic = "force-dynamic";

// Tope de reservas web que se leen para armar el directorio (las más
// recientes). Evita cargar la tabla completa en cada visita.
const MAX_WEB_BOOKINGS = 3000;

export default async function ClientesPage() {
  await requireStaffPage("clients_view");

  const [workshopClients, webBookings] = await Promise.all([
    prisma.workshopClient.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rut: true,
        createdAt: true,
        vehicles: { select: { plate: true, make: true, model: true } },
      },
    }),
    prisma.booking.findMany({
      where: realBookingWhere(),
      orderBy: { createdAt: "desc" },
      take: MAX_WEB_BOOKINGS,
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        vehicleMake: true,
        vehicleModel: true,
        createdAt: true,
      },
    }),
  ]);

  const clients: UnifiedClient[] = [];
  // Índices para deduplicar: el mismo cliente puede aparecer con el correo,
  // el teléfono (en distintos formatos) o la patente.
  const byEmail = new Map<string, UnifiedClient>();
  const byPhone = new Map<string, UnifiedClient>();
  const byPlate = new Map<string, UnifiedClient>();

  function index(c: UnifiedClient) {
    if (c.email) byEmail.set(c.email.toLowerCase(), c);
    const pk = phoneKey(c.phone);
    if (pk) byPhone.set(pk, c);
    for (const v of c.vehicles) if (v.plate) byPlate.set(v.plate, c);
  }

  // 1. Clientes del taller (tienen prioridad)
  for (const c of workshopClients) {
    const client: UnifiedClient = {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      rut: c.rut,
      source: "Taller",
      vehicles: c.vehicles,
      date: c.createdAt,
    };
    clients.push(client);
    index(client);
  }

  // 2. Clientes de reservas web que no estén ya en el taller
  for (const b of webBookings) {
    const vehicle = parseBookingVehicle(b.vehicleMake, b.vehicleModel);
    const existing =
      (b.customerEmail && byEmail.get(b.customerEmail.toLowerCase())) ||
      byPhone.get(phoneKey(b.customerPhone)) ||
      (vehicle.plate && byPlate.get(vehicle.plate)) ||
      undefined;

    if (existing) {
      if (vehicle.plate && !existing.vehicles.some((v) => v.plate === vehicle.plate)) {
        existing.vehicles.push(vehicle);
        byPlate.set(vehicle.plate, existing);
      }
      continue;
    }

    const client: UnifiedClient = {
      id: `web-${b.id}`,
      name: b.customerName,
      email: b.customerEmail,
      phone: b.customerPhone,
      rut: null,
      source: "Web",
      vehicles: [vehicle],
      date: b.createdAt,
    };
    clients.push(client);
    index(client);
  }

  clients.sort((a, b) => b.date.getTime() - a.date.getTime());

  return <ClientManager initialClients={clients} />;
}

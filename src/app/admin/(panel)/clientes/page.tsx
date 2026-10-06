import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-session";
import { realBookingWhere } from "@/lib/booking-constants";
import { parseBookingVehicle } from "@/lib/plate";
import { nameKey, webPersonKey } from "@/lib/client-identity";
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
        clientId: true,
        createdAt: true,
      },
    }),
  ]);

  const clients: UnifiedClient[] = [];
  const byId = new Map<string, UnifiedClient>();
  // Patente -> cliente del taller dueño del vehículo (con su nombre normalizado).
  const byPlate = new Map<string, { client: UnifiedClient; name: string }>();
  // Persona web (nombre + teléfono/correo) -> su entrada en el directorio.
  const byWebPerson = new Map<string, UnifiedClient>();

  function addVehicle(client: UnifiedClient, vehicle: { plate: string; make: string; model: string }) {
    if (vehicle.plate && !client.vehicles.some((v) => v.plate === vehicle.plate)) client.vehicles.push(vehicle);
  }

  // 1. Clientes del taller
  for (const c of workshopClients) {
    const client: UnifiedClient = {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      rut: c.rut,
      source: "Taller",
      vehicles: [...c.vehicles],
      date: c.createdAt,
    };
    clients.push(client);
    byId.set(c.id, client);
    for (const v of c.vehicles) byPlate.set(v.plate, { client, name: nameKey(c.name) });
  }

  // 2. Reservas web. Se asignan a un cliente del taller SOLO si están
  // vinculadas (Booking.clientId) o si es su mismo vehículo y su mismo
  // nombre. Correo o teléfono sueltos NO bastan: se repiten entre personas y
  // juntaban a clientes distintos en una sola ficha.
  for (const b of webBookings) {
    const vehicle = parseBookingVehicle(b.vehicleMake, b.vehicleModel);

    const linked = b.clientId ? byId.get(b.clientId) : undefined;
    const sameCar = vehicle.plate ? byPlate.get(vehicle.plate) : undefined;
    const owner = linked ?? (sameCar && sameCar.name === nameKey(b.customerName) ? sameCar.client : undefined);
    if (owner) {
      addVehicle(owner, vehicle);
      continue;
    }

    // Misma persona web (nombre + teléfono/correo): una sola entrada.
    const key = webPersonKey(b);
    const existing = byWebPerson.get(key);
    if (existing) {
      addVehicle(existing, vehicle);
      continue;
    }

    const client: UnifiedClient = {
      id: `web-${b.id}`,
      name: b.customerName,
      email: b.customerEmail,
      phone: b.customerPhone,
      rut: null,
      source: "Web",
      vehicles: vehicle.plate ? [vehicle] : [],
      date: b.createdAt,
    };
    clients.push(client);
    byWebPerson.set(key, client);
  }

  clients.sort((a, b) => b.date.getTime() - a.date.getTime());

  return <ClientManager initialClients={clients} />;
}

import { prisma } from "@/lib/prisma";
import { formatPlate } from "@/lib/plate";
import { Screen, PageHead, Empty } from "@/components/admin/kit";

export const metadata = {
  title: "Clientes | Lubrimax",
};

export const dynamic = "force-dynamic";

type UnifiedClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  rut: string | null;
  source: "Taller" | "Web";
  vehicles: { plate: string; make: string; model: string }[];
  date: Date;
};

export default async function ClientesPage() {
  const workshopClients = await prisma.workshopClient.findMany({
    orderBy: { createdAt: "desc" },
    include: { vehicles: true },
  });

  const allBookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" }
  });

  const clientsMap = new Map<string, UnifiedClient>();

  // 1. Agregar clientes del taller (tienen prioridad)
  for (const c of workshopClients) {
    // Usar email o teléfono como llave principal de deduplicación
    const key = c.email?.toLowerCase() || c.phone || c.id;
    clientsMap.set(key, {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      rut: c.rut,
      source: "Taller",
      vehicles: c.vehicles.map(v => ({ plate: v.plate, make: v.make, model: v.model })),
      date: c.createdAt
    });
  }

  // 2. Agregar clientes de reservas web que no estén ya en el taller
  for (const b of allBookings) {
    const key = b.customerEmail?.toLowerCase() || b.customerPhone || b.id;
    if (!clientsMap.has(key)) {
      
      // Extraer patente si viene en el modelo (ej: "Focus (Patente: ABCD12)")
      let plate = "";
      let make = b.vehicleMake;
      let model = b.vehicleModel;
      
      const patMatch = model.match(/\(Patente:\s*([^)]+)\)/i);
      if (patMatch) {
        plate = patMatch[1].trim();
        model = model.replace(/\s*\(Patente:\s*[^)]+\)/i, "").trim();
      }
      
      if (make.includes(" - ")) {
        make = make.split(" - ").pop() || make;
      }

      clientsMap.set(key, {
        id: `web-${b.id}`,
        name: b.customerName,
        email: b.customerEmail,
        phone: b.customerPhone,
        rut: null,
        source: "Web",
        vehicles: [{ plate, make, model }],
        date: b.createdAt
      });
    } else {
      // Si el cliente ya existe, agregar el vehículo si no está
      const existing = clientsMap.get(key)!;
      let plate = "";
      let make = b.vehicleMake;
      let model = b.vehicleModel;
      const patMatch = model.match(/\(Patente:\s*([^)]+)\)/i);
      if (patMatch) {
        plate = patMatch[1].trim();
        model = model.replace(/\s*\(Patente:\s*[^)]+\)/i, "").trim();
      }
      if (make.includes(" - ")) make = make.split(" - ").pop() || make;

      if (plate && !existing.vehicles.find(v => v.plate.toUpperCase() === plate.toUpperCase())) {
        existing.vehicles.push({ plate, make, model });
      }
    }
  }

  const clients = Array.from(clientsMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Screen size="xl">
      <PageHead
        title="Directorio de Clientes"
        subtitle="Listado unificado de clientes registrados en el taller y por reservas web."
      />

      {clients.length === 0 ? (
        <Empty>Aún no hay clientes registrados en el sistema.</Empty>
      ) : (
        <>
          {/* Escritorio: listado tipo tabla */}
          <div className="hidden md:block rounded-2xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="py-3 pl-4 pr-3 font-semibold">Cliente</th>
                  <th className="py-3 px-3 font-semibold">Contacto</th>
                  <th className="py-3 px-3 font-semibold">Origen</th>
                  <th className="py-3 pl-3 pr-4 font-semibold">Vehículos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="py-3 pl-4 pr-3 align-top">
                      <div className="font-bold text-white text-base">{c.name}</div>
                      {c.rut && <div className="text-xs text-gray-500 mt-0.5">RUT: {c.rut}</div>}
                    </td>
                    <td className="py-3 px-3 align-top text-gray-400 text-sm space-y-0.5">
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div>{c.email}</div>}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.source === 'Taller' ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-purple-500/20 text-purple-400'}`}>
                        {c.source}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-4 align-top">
                      {c.vehicles.length === 0 ? (
                        <span className="text-xs text-gray-600">Sin vehículos</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {c.vehicles.map((v, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              {v.plate ? (
                                <span className="bg-white/10 text-white font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  {formatPlate(v.plate)}
                                </span>
                              ) : null}
                              <span className="text-gray-400">{v.make} {v.model}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="md:hidden space-y-3">
            {clients.map((c) => (
              <li key={c.id} className="bg-brand-surface border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-bold text-white text-lg">{c.name}</div>
                    {c.rut && <div className="text-xs text-gray-500">RUT: {c.rut}</div>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${c.source === 'Taller' ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-purple-500/20 text-purple-400'}`}>
                    {c.source}
                  </span>
                </div>
                
                <div className="text-sm text-gray-400 space-y-0.5">
                  {c.phone && <div>{c.phone}</div>}
                  {c.email && <div>{c.email}</div>}
                </div>

                <div className="pt-2 border-t border-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5">Vehículos</div>
                  {c.vehicles.length === 0 ? (
                    <div className="text-xs text-gray-600">Sin vehículos</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {c.vehicles.map((v, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {v.plate && (
                            <span className="bg-white/10 text-white font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                              {formatPlate(v.plate)}
                            </span>
                          )}
                          <span className="text-gray-400">{v.make} {v.model}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}

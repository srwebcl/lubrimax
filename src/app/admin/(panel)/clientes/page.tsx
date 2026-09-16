import { prisma } from "@/lib/prisma";
import { formatPlate } from "@/lib/plate";

export const metadata = {
  title: "Clientes del Taller | Lubrimax",
};

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const clients = await prisma.workshopClient.findMany({
    orderBy: { createdAt: "desc" },
    include: { vehicles: true },
  });

  return (
    <div className="px-4 sm:px-6 py-4 max-w-4xl mx-auto w-full space-y-4">
      <header>
        <h1 className="text-[22px] leading-tight font-bold tracking-tight text-white">Clientes del Taller</h1>
        <p className="text-sm text-gray-500">Listado de clientes registrados físicamente en la recepción del taller.</p>
      </header>

      <div className="bg-brand-surface border border-white/5 rounded-2xl overflow-hidden">
        {clients.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            Aún no hay clientes registrados en el sistema.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {clients.map((c) => (
              <li key={c.id} className="p-4 sm:p-5 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{c.name}</h3>
                  <div className="text-sm text-gray-400 mt-1 space-y-0.5">
                    {c.rut && <p>RUT: {c.rut}</p>}
                    {c.phone && <p>Tel: {c.phone}</p>}
                    {c.email && <p>Correo: {c.email}</p>}
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Vehículos</div>
                  {c.vehicles.length === 0 ? (
                    <span className="text-sm text-gray-600">Sin vehículos</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {c.vehicles.map((v) => (
                        <div key={v.id} className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
                          <span className="font-bold text-white mr-1.5">{formatPlate(v.plate)}</span>
                          <span className="text-gray-400">{v.make} {v.model}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

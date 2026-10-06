import { prisma } from "@/lib/prisma";
import { requireStaffPage } from "@/lib/staff-session";
import { notFound } from "next/navigation";
import { Screen } from "@/components/admin/kit";
import { formatPlate, parseBookingVehicle } from "@/lib/plate";
import Link from "next/link";
import ClientProfileForm from "./ClientProfileForm";
import { can } from "@/lib/permissions";
import { getClientHistory } from "@/actions/admin-clients";

export const metadata = {
  title: "Perfil de Cliente | Lubrimax",
};

export default async function ClientProfilePage(props: { params: Promise<{ id: string }> }) {
  const session = await requireStaffPage("clients_view");
  const params = await props.params;
  const id = params.id;
  
  let clientData: any = null;
  let isWeb = false;

  if (id.startsWith("web-")) {
    isWeb = true;
    const bookingId = id.replace("web-", "");
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    });
    if (!booking) return notFound();

    const { plate, make, model } = parseBookingVehicle(booking.vehicleMake, booking.vehicleModel);

    clientData = {
      id: id,
      name: booking.customerName,
      rut: "",
      phone: booking.customerPhone,
      email: booking.customerEmail || "",
      vehicles: plate ? [{ plate, make, model }] : []
    };
  } else {
    const dbClient = await prisma.workshopClient.findUnique({
      where: { id },
      include: { vehicles: true }
    });
    if (!dbClient) return notFound();

    clientData = {
      id: dbClient.id,
      name: dbClient.name,
      rut: dbClient.rut || "",
      phone: dbClient.phone || "",
      email: dbClient.email || "",
      vehicles: dbClient.vehicles.map(v => ({ plate: v.plate, make: v.make, model: v.model }))
    };
  }

  const history = await getClientHistory(id);

  // Cliente web: sus vehículos salen de TODAS sus reservas (misma persona).
  if (isWeb) {
    const seen = new Set<string>();
    clientData.vehicles = history
      .filter((h) => h.plate && !seen.has(h.plate) && seen.add(h.plate))
      .map((h) => {
        const [make, ...rest] = h.vehicle.split(" ");
        return { plate: h.plate, make, model: rest.join(" ") };
      });
  }

  // Indicadores sobre lo REAL: visitas = veces que vino al taller; montos =
  // lo efectivamente pagado (no cotizaciones pendientes ni reservas futuras).
  const attended = history.filter((h) => h.status === "attended");
  const totalPaid = history.reduce((sum, h) => sum + (h.paid ?? 0), 0);
  const pendingBalance = attended.reduce((sum, h) => sum + (h.balance ?? 0), 0);
  const visitCount = attended.length;
  const avgTicket = visitCount > 0 ? Math.round(attended.reduce((s, h) => s + (h.total ?? 0), 0) / visitCount) : 0;
  const nextBooking = [...history].reverse().find((h) => h.status === "upcoming");

  const category = totalPaid > 300000 ? "VIP" : visitCount > 1 ? "Frecuente" : visitCount === 1 ? "Nuevo" : "Sin visitas";

  const longDay = (day: string) =>
    new Date(`${day}T12:00:00.000Z`).toLocaleDateString("es-CL", {
      timeZone: "UTC",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  const STATUS_LABEL = {
    attended: { text: "Atendido", cls: "bg-green-500/15 text-green-400" },
    upcoming: { text: "Próxima reserva", cls: "bg-sky-500/15 text-sky-400" },
    booked: { text: "Reservada · sin llegada registrada", cls: "bg-white/10 text-gray-400" },
  } as const;

  return (
    <Screen size="xl">
      <div className="mb-6">
        <Link href="/admin/clientes" className="text-brand-cyan hover:text-cyan-300 text-xs font-bold flex items-center gap-2 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver al Directorio
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">{clientData.name}</h1>
            <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
              <span>{isWeb ? "Origen: Reserva Web" : "Cliente Taller"}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span className={`font-bold ${category === 'VIP' ? 'text-yellow-400' : category === 'Frecuente' ? 'text-brand-cyan' : 'text-gray-400'}`}>
                {category === 'VIP' && "★ "}
                {category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isWeb && (
        <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl mb-6">
          <p className="text-sm text-purple-300 leading-relaxed">
            <strong>Modo Lectura / Prospecto:</strong> Este cliente proviene de una reserva web y aún no ha sido consolidado en la base de datos principal del taller. Para gestionar sus vehículos o editar sus datos, al guardar los cambios se convertirá automáticamente en un cliente permanente.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: Formulario y Vehículos */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-brand-surface border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Datos del Cliente
            </h2>
            <ClientProfileForm initialData={clientData} readOnly={!can(session, "clients_edit")} />
          </div>
        </div>

        {/* COLUMNA DERECHA: KPIs e Historial */}
        <div className="lg:col-span-7 space-y-6">
          {/* CRM KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Total Pagado</div>
              <div className="text-3xl font-black text-brand-cyan">
                ${totalPaid.toLocaleString("es-CL")}
              </div>
              {pendingBalance > 0 && (
                <div className="text-[11px] font-bold text-amber-400 mt-1">Saldo pendiente ${pendingBalance.toLocaleString("es-CL")}</div>
              )}
            </div>
            
            <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Visitas</div>
              <div className="text-3xl font-black text-white">
                {visitCount}
              </div>
              {nextBooking && (
                <div className="text-[11px] font-bold text-sky-400 mt-1">
                  Próxima: {nextBooking.day.split("-").reverse().join("/")} {nextBooking.time ?? ""}
                </div>
              )}
            </div>
            
            <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 flex flex-col justify-center col-span-2 sm:col-span-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Ticket Promedio</div>
              <div className="text-3xl font-black text-white">
                ${avgTicket.toLocaleString("es-CL")}
              </div>
            </div>
          </div>

          {/* Historial Timeline */}
          <div className="bg-brand-surface border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Línea de Tiempo de Servicios
            </h2>

            {history.length === 0 ? (
              <div className="bg-[#0D1117] border border-white/5 rounded-xl p-8 text-center">
                <svg className="w-12 h-12 text-white/10 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-400">El cliente no registra visitas ni reservas.</p>
              </div>
            ) : (
              <div className="relative border-l border-white/10 ml-3 space-y-8 pb-4">
                {history.map((h) => (
                  <div key={h.id} className="relative pl-8">
                    {/* Punto del timeline */}
                    <div className="absolute w-3 h-3 bg-brand-cyan rounded-full left-[-6px] top-1.5 shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-[#0D1117] border border-white/5 p-5 rounded-2xl shadow-sm hover:border-white/10 transition-colors">
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold text-brand-cyan">{h.origin.toUpperCase()}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_LABEL[h.status].cls}`}>
                              {STATUS_LABEL[h.status].text}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono">
                            {longDay(h.day)}
                            {h.time ? ` - ${h.time}` : ""}
                          </div>
                        </div>
                        
                        <div className="bg-white/5 inline-flex items-center gap-2 pr-3 pl-1 py-1 rounded-full border border-white/10">
                          {h.plate && (
                            <span className="font-mono text-white text-xs bg-black/40 px-2 py-0.5 rounded-full uppercase">
                              {formatPlate(h.plate)}
                            </span>
                          )}
                          <span className="text-xs text-gray-300">{h.vehicle}</span>
                        </div>
                        
                        {h.services && h.services.length > 0 && (
                          <div className="pt-2">
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">
                              {h.status === "attended" ? "Servicios realizados" : "Servicios reservados"}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {h.services.map((s, idx) => (
                                <span key={idx} className="text-xs font-semibold bg-white/5 text-white px-2.5 py-1 rounded-md border border-white/10">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {(h.notes || h.odometer) && (
                          <div className="pt-4 mt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {h.odometer && (
                              <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Kilometraje</div>
                                <div className="text-xs text-gray-300 font-mono">{h.odometer.toLocaleString("es-CL")} km</div>
                              </div>
                            )}
                            {h.notes && (
                              <div className="sm:col-span-2">
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Observaciones</div>
                                <div className="text-xs text-gray-400 italic line-clamp-3">"{h.notes}"</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {h.total ? (
                        <div className="sm:text-right shrink-0">
                          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total</div>
                          <div className="text-xl font-black text-white">${h.total.toLocaleString("es-CL")}</div>
                          {(h.balance ?? 0) > 0 ? (
                            <div className="text-[11px] font-bold text-amber-400 mt-0.5">
                              Pagado ${(h.paid ?? 0).toLocaleString("es-CL")} · saldo ${h.balance!.toLocaleString("es-CL")}
                            </div>
                          ) : (
                            <div className="text-[11px] font-bold text-green-400 mt-0.5">Pagado</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}

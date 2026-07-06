import React from "react";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const metadata = {
  title: "Admin | Centro de Comando Lubrimax",
};

export default async function AdminDashboard() {
  const bookings = await prisma.booking.findMany({
    orderBy: [
      { date: "desc" },
      { startTime: "desc" }
    ],
    include: { service: true },
  });

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="min-h-screen bg-brand-pure text-brand-chrome py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Resplandor decorativo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[100px] bg-brand-blue/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12 border-b border-white/10 pb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold uppercase tracking-widest text-white italic drop-shadow-md mb-2">
              Centro de Comando <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">Lubrimax</span>
            </h1>
            <p className="text-gray-400">Sistema central de reservas y operaciones</p>
          </div>
          <div className="hidden md:block">
            <span className="bg-brand-cyan/20 border border-brand-cyan/50 text-brand-cyan px-4 py-2 rounded uppercase tracking-widest text-xs font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              Admin Mode
            </span>
          </div>
        </header>

        {/* Tarjetas de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-brand-surface border border-white/5 p-6 rounded-lg shadow-lg relative overflow-hidden group hover:border-white/20 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-cyan" />
            <h3 className="text-gray-400 text-sm uppercase tracking-widest font-bold mb-2">Reservas Totales</h3>
            <p className="text-4xl font-black text-white">{totalBookings}</p>
          </div>
          <div className="bg-brand-surface border border-white/5 p-6 rounded-lg shadow-lg relative overflow-hidden group hover:border-white/20 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
            <h3 className="text-gray-400 text-sm uppercase tracking-widest font-bold mb-2">Confirmadas</h3>
            <p className="text-4xl font-black text-white">{confirmedBookings}</p>
          </div>
          <div className="bg-brand-surface border border-white/5 p-6 rounded-lg shadow-lg relative overflow-hidden group hover:border-white/20 transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue" />
            <h3 className="text-gray-400 text-sm uppercase tracking-widest font-bold mb-2">Última Actividad</h3>
            <p className="text-xl font-bold text-white mt-2">
              {bookings[0] ? format(bookings[0].createdAt, "dd MMM HH:mm", { locale: es }) : "N/A"}
            </p>
          </div>
        </div>

        {/* Tabla de Reservas */}
        <div className="bg-brand-surface/50 border border-white/10 rounded-lg overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/50 text-gray-400 uppercase tracking-widest text-xs border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-bold">Cliente</th>
                  <th className="px-6 py-4 font-bold">Vehículo</th>
                  <th className="px-6 py-4 font-bold">Servicio</th>
                  <th className="px-6 py-4 font-bold">Fecha y Hora</th>
                  <th className="px-6 py-4 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-white/5 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{booking.customerName}</div>
                      <div className="text-xs text-gray-500 mt-1">{booking.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">{booking.vehicleMake}</div>
                      <div className="text-xs text-brand-cyan uppercase tracking-wider mt-1">{booking.vehicleModel}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">{booking.service.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{booking.service.duration / 60} hrs</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">
                        {format(new Date(booking.date), "dd MMM yyyy", { locale: es })}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{booking.startTime}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${
                        booking.status === 'CONFIRMED' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                          : 'bg-brand-blue/10 text-brand-cyan border border-brand-blue/30'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No hay reservas registradas en el sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

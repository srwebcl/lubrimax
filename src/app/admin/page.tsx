import React from "react";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import BookingsManager from "./BookingsManager";

export const metadata = {
  title: "Admin | Centro de Comando Lubrimax",
};

export default async function AdminDashboard() {
  const bookings = await prisma.booking.findMany({
    orderBy: [
      { date: "desc" },
      { startTime: "desc" }
    ],
    include: { services: true },
  });

  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="min-h-screen bg-brand-pure text-brand-chrome py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Resplandor decorativo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[100px] bg-brand-blue/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12 border-b border-white/10 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold uppercase tracking-widest text-white italic drop-shadow-md mb-2">
              Centro de Comando <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">Lubrimax</span>
            </h1>
            <p className="text-gray-400">Sistema central de reservas y operaciones</p>
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
        <BookingsManager initialBookings={bookings} />
      </div>
    </div>
  );
}

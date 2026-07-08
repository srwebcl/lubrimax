import React from "react";
import BookingWizard from "@/components/booking/BookingWizard";
import Navbar from "@/components/dom/Navbar";

export const metadata = {
  title: "Agendar Cita | LUBRIMAX Clínica Automotriz",
  description: "Reserva tu hora para detallado, sellado cerámico y estética automotriz en LUBRIMAX.",
};

export default function AgendarPage() {
  return (
    <div className="min-h-screen bg-brand-pure flex flex-col relative overflow-hidden">

      {/* Malla Hexagonal de Fondo Tenue */}
      <div 
        className="absolute inset-0 z-0 opacity-5 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='103.923' viewBox='0 0 60 103.923' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.923L0 86.6025V51.9615L30 34.641L60 51.9615V86.6025L30 103.923ZM30 102.768L59 86.025V52.5385L30 35.795L1 52.5385V86.025L30 102.768ZM30 51.9615L0 34.641V0L30 -17.3205L60 0V34.641L30 51.9615ZM30 50.806L59 34.064V0.577L30 -16.166L1 0.577V34.064L30 50.806Z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: "60px",
        }}
      />

      <main className="flex-1 container mx-auto px-4 py-32 relative z-10 flex flex-col justify-center">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold italic uppercase tracking-widest text-brand-chrome mb-4">
            Reserva tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">Cita</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Configura el tratamiento ideal para tu vehículo. Sistema de agenda en tiempo real.
          </p>
        </div>

        <BookingWizard />
      </main>
    </div>
  );
}

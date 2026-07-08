import React from "react";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="relative py-24 bg-brand-pure overflow-hidden border-t border-white/5 border-b">
      {/* Patrón Hexagonal de Fondo */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='103.923' viewBox='0 0 60 103.923' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 103.923L0 86.6025V51.9615L30 34.641L60 51.9615V86.6025L30 103.923ZM30 102.768L59 86.025V52.5385L30 35.795L1 52.5385V86.025L30 102.768ZM30 51.9615L0 34.641V0L30 -17.3205L60 0V34.641L30 51.9615ZM30 50.806L59 34.064V0.577L30 -16.166L1 0.577V34.064L30 50.806Z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: "60px",
        }}
      />

      {/* Resplandor Central */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[200px] bg-brand-cyan/20 blur-[120px] pointer-events-none rounded-full mix-blend-screen" />

      <div className="container mx-auto px-4 relative z-10 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold italic uppercase tracking-widest text-white mb-6 drop-shadow-lg leading-tight px-2">
          Protección premium y <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">brillo absoluto</span>, sin compromisos.
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-10">
          Nuestra agenda se llena rápido. Asegura tu espacio hoy y transforma la estética de tu automóvil con los mejores expertos de La Serena.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
          <Link
            href="/agendar"
            className="w-full sm:w-auto relative overflow-hidden bg-brand-cyan text-brand-pure font-bold px-8 py-4 uppercase tracking-widest rounded-sm group shadow-[0_0_20px_rgba(56,189,248,0.4)] transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(56,189,248,0.7)]"
          >
            <span className="relative z-10">Agendar mi Cita</span>
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

          <a
            href="https://wa.me/56912345678" // Link placeholder, se puede configurar luego
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto relative overflow-hidden bg-transparent border border-white/20 text-white font-bold px-8 py-4 uppercase tracking-widest rounded-sm group transition-all hover:border-brand-cyan hover:text-brand-cyan hover:bg-brand-cyan/10"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.12.553 4.111 1.527 5.836L.452 22l4.298-1.127A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.996c-1.848 0-3.618-.485-5.214-1.4l-.374-.216-3.197.839.852-3.118-.237-.377A9.972 9.972 0 012.004 12C2.004 6.486 6.486 2 12 2s9.996 4.486 9.996 10-4.486 10-9.996 10z"/>
              </svg>
              Hablar con un Experto
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

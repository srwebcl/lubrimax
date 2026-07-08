import React from 'react';

export default function Stats() {
  const stats = [
    { value: "+1000", label: "Vehículos Protegidos" },
    { value: "5 Años", label: "Garantía Cerámica" },
    { value: "3D", label: "Tecnología de Inspección" },
    { value: "Certificación", label: "Internacional Detailing" },
  ];

  return (
    <section className="relative z-40 -mt-24 md:-mt-32 mb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-brand-surface/60 backdrop-blur-xl border border-white/10 rounded-2xl py-6 md:py-8 relative overflow-hidden shadow-2xl">
        {/* Resplandor central de fondo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[60px] bg-brand-blue/15 blur-[60px] pointer-events-none rounded-full" />
        
        <div className="relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center divide-x-0 md:divide-x divide-white/10">
          
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center justify-center p-2 md:p-3 text-center">
              <span className="text-xl md:text-2xl font-black italic uppercase text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 drop-shadow-sm mb-1 tracking-tighter pr-2">
                {stat.value}
              </span>
              <span className="text-brand-chrome text-[9px] md:text-[10px] uppercase tracking-widest font-bold opacity-70">
                {stat.label}
              </span>
            </div>
          ))}

          </div>
        </div>
      </div>
    </section>
  );
}

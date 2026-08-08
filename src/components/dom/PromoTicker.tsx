import React from 'react';

export default function PromoTicker() {
  const text = '⚡ AGENDA TU SELLADO CERÁMICO HOY Y OBTÉN UN LAVADO DE CHASIS GRATIS ⚡';
  
  // Repetimos el texto para asegurar que cubra toda la pantalla y permita un loop fluido
  const items = Array(15).fill(text);
  
  return (
    <div className="bg-gradient-to-r from-brand-cyan/20 via-brand-blue/30 to-brand-cyan/20 border-y border-brand-cyan/30 text-gray-300 py-6 overflow-hidden flex whitespace-nowrap w-full shadow-[0_0_50px_rgba(0,180,216,0.15)] relative">
      {/* Resplandor superior e inferior */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent" />

      <div className="animate-marquee-left flex shrink-0 [animation-duration:50s]">
        {items.map((item, i) => (
          <span key={i} className="mx-8 font-black tracking-[0.25em] text-sm md:text-base uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-cyan drop-shadow-[0_0_10px_rgba(0,180,216,0.3)]">
            {item}
          </span>
        ))}
      </div>
      <div className="animate-marquee-left flex shrink-0 [animation-duration:50s]" aria-hidden="true">
        {items.map((item, i) => (
          <span key={i} className="mx-8 font-black tracking-[0.25em] text-sm md:text-base uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-brand-cyan drop-shadow-[0_0_10px_rgba(0,180,216,0.3)]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

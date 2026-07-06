import React from 'react';

export default function PromoTicker() {
  const text = '⚡ AGENDA TU SELLADO CERÁMICO HOY Y OBTÉN UN LAVADO DE CHASIS GRATIS ⚡';
  
  // Repetimos el texto para asegurar que cubra toda la pantalla y permita un loop fluido
  const items = Array(15).fill(text);
  
  return (
    <div className="bg-brand-blue text-white py-2 overflow-hidden flex whitespace-nowrap w-full">
      <div className="animate-marquee-left flex shrink-0">
        {items.map((item, i) => (
          <span key={i} className="mx-4 font-semibold tracking-wide text-sm">{item}</span>
        ))}
      </div>
      <div className="animate-marquee-left flex shrink-0" aria-hidden="true">
        {items.map((item, i) => (
          <span key={i} className="mx-4 font-semibold tracking-wide text-sm">{item}</span>
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
  category: string;
};

export default function ServicesTabs({ services }: { services: Service[] }) {
  const categories = ["Lavados", "Detailing", "Servicios Especiales", "Mecánica"];
  const [activeTab, setActiveTab] = useState(categories[0]);

  const filteredServices = services.filter((s) => s.category === activeTab);

  return (
    <div>
      {/* Tabs Nav */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveTab(category)}
            className={`px-6 py-3 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300 ${
              activeTab === category
                ? "bg-brand-cyan text-brand-pure shadow-[0_0_15px_rgba(56,189,248,0.4)]"
                : "bg-transparent border border-white/10 text-gray-400 hover:text-white hover:border-brand-cyan/50"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredServices.map((service) => (
          <div 
            key={service.id} 
            className="group relative bg-brand-surface/50 backdrop-blur-md border border-white/5 rounded-sm p-8 overflow-hidden transition-all duration-500 hover:border-brand-cyan/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.2)] hover:-translate-y-2 flex flex-col h-full"
          >
            {/* Glow Effect Top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="mb-6 flex-grow">
              <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">{service.name}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {service.description}
              </p>
            </div>

            <div className="mt-auto border-t border-white/10 pt-6">
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-gray-500 uppercase tracking-wider font-bold">Duración Aprox.</span>
                <span className="text-brand-chrome font-medium">{service.duration / 60} horas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 uppercase tracking-wider font-bold">Desde</span>
                <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">
                  ${service.priceAuto?.toLocaleString("es-CL")}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filteredServices.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-12">
            No hay servicios disponibles en esta categoría por el momento.
          </div>
        )}
      </div>
    </div>
  );
}

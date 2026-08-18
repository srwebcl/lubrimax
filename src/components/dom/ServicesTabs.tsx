"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

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
  const allCategories = ["Todos", "Lavados", "Detailing", "Servicios Especiales", "Mecánica"];
  const [activeTab, setActiveTab] = useState(allCategories[0]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const filteredServices = activeTab === "Todos" 
    ? services 
    : services.filter((s) => s.category === activeTab);

  // Helper para simular imágenes por categoría hasta que se suban reales a la BD
  const getServiceImage = (category: string) => {
    switch (category) {
      case "Lavados": return "/videos/reel-1-thumbnail.webp";
      case "Detailing": return "/videos/reel-2-thumbnail.webp";
      case "Servicios Especiales": return "/videos/reel-3-thumbnail.webp";
      default: return "/videos/reel-4-thumbnail.webp";
    }
  };

  return (
    <div>
      {/* Tabs Nav */}
      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar md:flex-wrap md:justify-center gap-2 md:gap-4 mb-12 pb-4 px-2 md:px-0">
        {allCategories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveTab(category)}
            className={`shrink-0 snap-center px-6 py-3 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300 ${
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
            onClick={() => setSelectedService(service)}
            className="group relative bg-brand-surface/50 backdrop-blur-md border border-white/5 rounded-sm p-8 overflow-hidden transition-all duration-500 hover:border-brand-cyan/50 hover:shadow-[0_0_30px_rgba(56,189,248,0.2)] hover:-translate-y-2 flex flex-col h-full cursor-pointer"
          >
            {/* Glow Effect Top */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Icono de Lupa sutil para indicar clic */}
            <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-white/10">
              <svg className="w-4 h-4 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>

            <div className="mb-6 flex-grow">
              <h3 className="text-xl font-bold text-white mb-3 uppercase tracking-wide pr-6">{service.name}</h3>
              <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                {service.description}
              </p>
            </div>

            <div className="mt-auto border-t border-white/10 pt-6">
              <div className="flex justify-between items-center mb-4 text-sm">
                <span className="text-gray-500 uppercase tracking-wider font-bold">Duración</span>
                <span className="text-brand-chrome font-medium">{service.duration / 60} hrs</span>
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

      {/* Modal / Popup de Servicio */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedService(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-pure/90 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-brand-surface border border-white/10 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row relative"
            >
              {/* Botón Cerrar */}
              <button 
                onClick={() => setSelectedService(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur-md hover:bg-black/80 rounded-full flex items-center justify-center transition-colors border border-white/20 z-50 text-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Imagen Izquierda (o Superior en Móvil) */}
              <div className="w-full md:w-2/5 h-48 md:h-auto relative overflow-hidden">
                <Image
                  src={getServiceImage(selectedService.category)}
                  alt={selectedService.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-surface via-transparent to-transparent md:bg-gradient-to-l md:from-brand-surface md:via-transparent md:to-transparent" />
              </div>

              {/* Contenido Derecha */}
              <div className="w-full md:w-3/5 p-6 md:p-8 flex flex-col">
                <span className="text-brand-cyan text-xs uppercase tracking-widest font-bold mb-2 block">{selectedService.category}</span>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 uppercase tracking-wider">{selectedService.name}</h2>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-6 flex-grow">
                  {selectedService.description || "Un tratamiento premium diseñado para restaurar y proteger la estética de tu vehículo."}
                </p>

                <div className="bg-black/30 border border-white/5 rounded-lg p-4 mb-6 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 uppercase tracking-widest">Auto / HB</span>
                    <span className="text-white font-bold">${selectedService.priceAuto?.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 uppercase tracking-widest">SUV Medianos</span>
                    <span className="text-white font-bold">${selectedService.priceSuv2?.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 uppercase tracking-widest">SUV Grandes</span>
                    <span className="text-white font-bold">${selectedService.priceSuv3?.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 mt-3 flex justify-between items-center text-sm">
                    <span className="text-brand-cyan uppercase tracking-widest font-bold">Tiempo Estimado</span>
                    <span className="text-brand-cyan font-bold">{selectedService.duration / 60} horas</span>
                  </div>
                </div>

                <Link
                  href="/agendar"
                  className="w-full text-center block bg-brand-chrome text-brand-pure py-4 rounded font-bold uppercase tracking-widest text-sm hover:bg-brand-cyan transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                >
                  Agendar este Servicio
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MessageCircle, ChevronRight, Check, Info, X } from "lucide-react";

interface ServiceProps {
  id: string;
  name: string;
  description: string | null;
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
  badges?: string[];
  variants?: any;
  image?: string | null;
  images?: string[];
}

interface ServiceCardProps {
  service: ServiceProps;
  images: string[];
  isMechanic: boolean;
}

export default function ServiceCard({ service, images, isMechanic }: ServiceCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayImages = service.images && service.images.length > 0 
    ? service.images 
    : (service.image ? [service.image] : images);

  // Auto-cycle images on hover
  const handleMouseEnter = () => {
    if (displayImages.length > 1) {
      setCurrentImage((prev) => (prev + 1) % displayImages.length);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onMouseEnter={handleMouseEnter}
      className="bg-[#0f1115] border border-white/5 rounded-2xl overflow-hidden flex flex-col group relative shadow-2xl hover:shadow-[0_0_30px_rgba(0,180,216,0.15)] transition-all duration-500"
    >
      {/* Resplandor superior en hover */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Imagen Superior con Multi-capa */}
      <div className="relative h-56 w-full overflow-hidden cursor-pointer" onClick={handleMouseEnter}>
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentImage}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            src={displayImages[currentImage]} 
            alt={service.name} 
            className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100"
          />
        </AnimatePresence>
        
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1115] via-transparent to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f1115]/50 to-transparent z-10" />

        {/* Indicadores de imagen */}
        {displayImages.length > 1 && (
          <div className="absolute top-3 right-3 z-20 flex gap-1">
            {displayImages.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1 rounded-full transition-all duration-300 ${idx === currentImage ? 'w-4 bg-brand-cyan' : 'w-1.5 bg-white/30'}`} 
              />
            ))}
          </div>
        )}

        {/* Badge de Variantes */}
        {service.variants && service.variants.length > 0 && (
          <div className="absolute top-3 left-3 z-20">
            <span className="bg-brand-cyan text-brand-pure text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-sm shadow-lg flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
              {service.variants.length} Opciones
            </span>
          </div>
        )}

        <div className="absolute bottom-4 left-5 right-5 z-20">
          {service.badges && service.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {service.badges.map((badge, idx) => (
                <span key={idx} className="bg-brand-cyan/20 border border-brand-cyan/50 text-brand-cyan text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm backdrop-blur-md">
                  {badge}
                </span>
              ))}
            </div>
          )}
          <h3 className="text-2xl font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">
            {service.name}
          </h3>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col relative z-20 bg-[#0f1115]">
        {/* Descripción corta y botón Ver Más */}
        <div className="flex-1 mb-6">
          {service.description ? (
            <>
              <p className="text-gray-400 text-sm leading-relaxed font-light line-clamp-2 mb-2">
                {service.description}
              </p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-brand-cyan hover:text-white text-xs font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                <Info className="w-3 h-3" /> Ver detalle completo
              </button>
            </>
          ) : (
            <p className="text-gray-500 text-sm italic font-light">Sin descripción detallada.</p>
          )}
        </div>
        
        {/* Separador */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />

        {/* Precios y CTA */}
        {service.priceAuto !== null ? (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="group/tt relative bg-white/[0.02] border border-white/5 rounded-lg p-2 flex flex-col items-center justify-between transition-colors hover:bg-white/[0.04] cursor-help">
                <span className="text-[8.5px] sm:text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium border-b border-dashed border-gray-500/50 text-center w-full whitespace-nowrap pb-1">Auto</span>
                <div className="flex flex-col items-center justify-end w-full">
                  <div className="h-[10px] flex items-center justify-center mb-1">
                    {service.variants && service.variants.length > 0 && <span className="text-[7.5px] text-brand-cyan font-bold uppercase tracking-widest leading-none">Desde</span>}
                  </div>
                  <span className="font-bold text-white text-xs sm:text-sm leading-none">
                    ${service.priceAuto.toLocaleString("es-CL")}
                  </span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-black/90 backdrop-blur-md border border-brand-cyan/30 text-white text-[10px] text-center rounded opacity-0 invisible group-hover/tt:opacity-100 group-hover/tt:visible transition-all z-30 pointer-events-none shadow-xl">
                  Sedán, Hatchback, Citycar
                </div>
              </div>

              <div className="group/tt relative bg-white/[0.02] border border-white/5 rounded-lg p-2 flex flex-col items-center justify-between transition-colors hover:bg-white/[0.04] cursor-help">
                <span className="text-[8.5px] sm:text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium border-b border-dashed border-gray-500/50 text-center w-full whitespace-nowrap pb-1">SUV Medianos</span>
                <div className="flex flex-col items-center justify-end w-full">
                  <div className="h-[10px] flex items-center justify-center mb-1">
                    {service.variants && service.variants.length > 0 && service.priceSuv2 && <span className="text-[7.5px] text-brand-cyan font-bold uppercase tracking-widest leading-none">Desde</span>}
                  </div>
                  <span className="font-bold text-white text-xs sm:text-sm leading-none">
                    {service.priceSuv2 ? `$${service.priceSuv2.toLocaleString("es-CL")}` : "-"}
                  </span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-black/90 backdrop-blur-md border border-brand-cyan/30 text-white text-[10px] text-center rounded opacity-0 invisible group-hover/tt:opacity-100 group-hover/tt:visible transition-all z-30 pointer-events-none shadow-xl">
                  SUV Mediano, Pick-up mediana
                </div>
              </div>

              <div className="group/tt relative bg-white/[0.02] border border-white/5 rounded-lg p-2 flex flex-col items-center justify-between transition-colors hover:bg-white/[0.04] cursor-help">
                <span className="text-[8.5px] sm:text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-medium border-b border-dashed border-gray-500/50 text-center w-full whitespace-nowrap pb-1">SUV Grandes</span>
                <div className="flex flex-col items-center justify-end w-full">
                  <div className="h-[10px] flex items-center justify-center mb-1">
                    {service.variants && service.variants.length > 0 && service.priceSuv3 && <span className="text-[7.5px] text-brand-cyan font-bold uppercase tracking-widest leading-none">Desde</span>}
                  </div>
                  <span className="font-bold text-white text-xs sm:text-sm leading-none">
                    {service.priceSuv3 ? `$${service.priceSuv3.toLocaleString("es-CL")}` : "-"}
                  </span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 p-2 bg-black/90 backdrop-blur-md border border-brand-cyan/30 text-white text-[10px] text-center rounded opacity-0 invisible group-hover/tt:opacity-100 group-hover/tt:visible transition-all z-30 pointer-events-none shadow-xl">
                  SUV Grande, Camionetas grandes (RAM, F-150)
                </div>
              </div>
            </div>

            <Link 
              href={`/agendar?service=${service.id}`}
              className="w-full relative overflow-hidden bg-white/5 hover:bg-brand-cyan border border-white/10 hover:border-brand-cyan text-white hover:text-[#0f1115] font-bold uppercase tracking-widest text-xs py-3.5 rounded-lg text-center transition-all duration-300 flex items-center justify-center gap-2 group/btn"
            >
              <Calendar className="w-4 h-4" />
              <span>Agendar Hora</span>
              <ChevronRight className="w-4 h-4 absolute right-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-brand-cyan uppercase tracking-widest mb-1 font-bold">Evaluación Técnica</span>
              <span className="font-bold text-gray-300 text-sm">
                Valor sujeto a revisión presencial
              </span>
            </div>

            <a 
              href={`https://wa.me/56982703493?text=Hola, quiero consultar por el servicio de ${service.name}`}
              target="_blank"
              rel="noreferrer"
              className="w-full relative overflow-hidden bg-[#25D366]/10 hover:bg-[#25D366] border border-[#25D366]/30 hover:border-[#25D366] text-[#25D366] hover:text-black font-bold uppercase tracking-widest text-xs py-3.5 rounded-lg text-center transition-all duration-300 flex items-center justify-center gap-2 group/btn"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Consultar por WhatsApp</span>
              <ChevronRight className="w-4 h-4 absolute right-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
            </a>
          </div>
        )}
      </div>

      {/* Modal de Detalle Completo */}
      {mounted && createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-start">
                <div>
                  {service.badges && service.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {service.badges.map((badge, idx) => (
                        <span key={idx} className="bg-brand-cyan/20 border border-brand-cyan/50 text-brand-cyan text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm">
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                  <h3 className="text-2xl font-black uppercase tracking-wider text-white">
                    {service.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <h4 className="text-xs uppercase tracking-widest text-brand-cyan font-bold mb-4">Detalle del Servicio</h4>
                <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {service.description || "Sin descripción adicional."}
                </div>
                
                {service.variants && service.variants.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-6">
                    <h4 className="text-xs uppercase tracking-widest text-brand-cyan font-bold mb-4">Opciones Disponibles</h4>
                    <div className="space-y-3">
                      {service.variants.map((variant: any, idx: number) => (
                        <div key={idx} className="bg-black/40 border border-white/5 p-4 rounded-lg flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <div className="text-white font-bold text-sm">{variant.name}</div>
                            <div className="text-gray-500 text-[10px] uppercase tracking-widest">{variant.duration} Min</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white/5 rounded p-2 text-center">
                              <div className="text-gray-400 text-[9px] uppercase mb-1 border-b border-white/10 pb-1">Auto</div>
                              <div className="text-brand-cyan font-bold text-xs">${variant.priceAuto?.toLocaleString('es-CL') || "0"}</div>
                            </div>
                            <div className="bg-white/5 rounded p-2 text-center">
                              <div className="text-gray-400 text-[9px] uppercase mb-1 border-b border-white/10 pb-1">SUV Medianos</div>
                              <div className="text-white font-bold text-xs">{variant.priceSuv2 ? `$${variant.priceSuv2.toLocaleString('es-CL')}` : "-"}</div>
                            </div>
                            <div className="bg-white/5 rounded p-2 text-center">
                              <div className="text-gray-400 text-[9px] uppercase mb-1 border-b border-white/10 pb-1">SUV Grandes</div>
                              <div className="text-white font-bold text-xs">{variant.priceSuv3 ? `$${variant.priceSuv3.toLocaleString('es-CL')}` : "-"}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-white/5 bg-black/20">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-widest text-xs py-3 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}

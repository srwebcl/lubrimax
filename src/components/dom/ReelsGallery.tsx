"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  reels: string[];
}

export default function ReelsGallery({ reels }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  // El sonido arranca SIEMPRE apagado (los navegadores bloquean el
  // autoplay con audio sin un gesto previo del usuario). Un solo botón
  // controla el video activo/centrado; los de atrás nunca suenan.
  const [muted, setMuted] = useState(true);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Aplica el estado de sonido al video activo cada vez que cambia el
  // slide o se toca el botón. Si el navegador rechaza el audio (política
  // de autoplay), volvemos a silenciar en vez de dejar el video pausado.
  useEffect(() => {
    const el = activeVideoRef.current;
    if (!el) return;
    el.muted = muted;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => setMuted(true));
    }
  }, [activeIndex, muted]);

  const handleNext = () => {
    setActiveIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => prev - 1);
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = Math.abs(offset.x) * velocity.x;
    if (swipe < -1000 || offset.x < -50) {
      handleNext();
    } else if (swipe > 1000 || offset.x > 50) {
      handlePrev();
    }
  };

  if (!isMounted || !reels || reels.length === 0) return null;

  // Calculamos la ventana de 5 slides basados en el índice virtual infinito
  const slides = [];
  for (let i = -2; i <= 2; i++) {
    const virtualIndex = activeIndex + i;
    // Mapear el índice virtual al índice real del array (manejando números negativos)
    const actualIndex = ((virtualIndex % reels.length) + reels.length) % reels.length;
    const reelId = reels[actualIndex];
    const offset = i;
    const isActive = offset === 0;

    slides.push(
      <motion.div
        key={virtualIndex}
        initial={{ opacity: 0, x: offset * (typeof window !== 'undefined' && window.innerWidth < 768 ? 80 : 320) + (offset > 0 ? 100 : -100), scale: 0.8 }}
        animate={{
          opacity: isActive ? 1 : 0.4,
          x: offset * (typeof window !== 'undefined' && window.innerWidth < 768 ? 80 : 320),
          scale: isActive ? 1 : 0.85,
          zIndex: isActive ? 50 : 40 - Math.abs(offset)
        }}
        exit={{ opacity: 0, scale: 0.8, x: offset * (typeof window !== 'undefined' && window.innerWidth < 768 ? 80 : 320) + (offset > 0 ? 100 : -100) }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`absolute w-[280px] md:w-[320px] h-[500px] md:h-[580px] rounded-2xl overflow-hidden shadow-2xl border ${isActive ? 'border-brand-cyan/50 shadow-[0_0_40px_rgba(56,189,248,0.2)]' : 'border-white/10'}`}
        onClick={() => !isActive && setActiveIndex(virtualIndex)}
        style={{ cursor: isActive ? "default" : "pointer" }}
      >
        {/* Overlay transparente para interceptar clicks en slides inactivos */}
        {!isActive && (
          <div className="absolute inset-0 z-20 bg-black/50 hover:bg-black/30 transition-colors backdrop-blur-[2px]" />
        )}

        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-black">
          <video
            ref={isActive ? activeVideoRef : undefined}
            src={reelId}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted={!isActive || muted}
            playsInline
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full relative z-10 flex flex-col items-center overflow-hidden">
      <div className="relative w-full max-w-6xl flex justify-center items-center h-[600px] md:h-[650px]">

        {/* Carrusel Dinámico 3D con soporte para Swipe */}
        <motion.div
          className="relative w-full h-full flex justify-center items-center touch-pan-y"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence initial={false}>
            {slides}
          </AnimatePresence>
        </motion.div>

        {/* Control de sonido — único para toda la sección, aplica al video activo */}
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          aria-pressed={!muted}
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 pl-3 pr-4 py-2 rounded-full border backdrop-blur-md transition-colors ${
            muted
              ? "bg-black/60 border-white/15 text-gray-300 hover:border-white/30"
              : "bg-brand-cyan/15 border-brand-cyan/50 text-brand-cyan shadow-[0_0_20px_rgba(56,189,248,0.25)]"
          }`}
        >
          {muted ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5L6 9H3v6h3l5 4V5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9l4 6m0-6l-4 6" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5L6 9H3v6h3l5 4V5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.5 8.5a5 5 0 010 7M18 6a9 9 0 010 12" />
            </svg>
          )}
          <span className="text-xs font-bold uppercase tracking-widest">
            {muted ? "Activar sonido" : "Silenciar"}
          </span>
        </button>
      </div>
    </div>
  );
}

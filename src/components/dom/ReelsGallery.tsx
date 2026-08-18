"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  reels: string[];
}

export default function ReelsGallery({ reels }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
            src={reelId}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full relative z-10 flex flex-col items-center">
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
      </div>
    </div>
  );
}

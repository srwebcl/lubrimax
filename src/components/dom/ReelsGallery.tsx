"use client";

import React, { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

// Simulamos 10 videos (pueden repetir los mismos mp4 para el demo)
const ALL_VIDEOS = [
  "/videos/reel-1.mp4",
  "/videos/reel-2.mp4",
  "/videos/reel-3.mp4",
  "/videos/reel-4.mp4",
  "/videos/reel-5.mp4",
  "/videos/reel-1.mp4", 
  "/videos/reel-2.mp4",
  "/videos/reel-3.mp4",
  "/videos/reel-4.mp4",
  "/videos/reel-5.mp4",
];

// Para el scroll infinito en Desktop (Ultrawide)
const ROW_1_BASE = ALL_VIDEOS.slice(0, 5);
const ROW_2_BASE = ALL_VIDEOS.slice(5, 10);

const ROW_1_VIDEOS = [...ROW_1_BASE, ...ROW_1_BASE, ...ROW_1_BASE, ...ROW_1_BASE];
const ROW_2_VIDEOS = [...ROW_2_BASE, ...ROW_2_BASE, ...ROW_2_BASE, ...ROW_2_BASE];

export default function ReelsGallery() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <>
      {/* ======================= */}
      {/* VERSIÓN MOBILE (TikTok) */}
      {/* ======================= */}
      <div className="grid grid-cols-2 gap-3 w-full md:hidden relative z-10">
        {ALL_VIDEOS.map((videoSrc, index) => (
          <div 
            key={`mobile-${index}`}
            onClick={() => setActiveVideo(videoSrc)}
            className="w-full aspect-[9/16] shrink-0 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5 bg-brand-surface relative cursor-pointer active:scale-[0.98] transition-transform"
          >
            {/* Overlay con icono de Play */}
            <div className="absolute inset-0 bg-black/20 opacity-0 active:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
              <div className="w-12 h-12 bg-brand-cyan/40 backdrop-blur-md rounded-full flex items-center justify-center border border-brand-cyan/80">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            <Image
              src={videoSrc.replace('.mp4', '-thumbnail.webp')}
              alt="Reel thumbnail"
              fill
              sizes="90vw"
              loading="lazy"
              className="object-cover pointer-events-none relative z-10"
            />
          </div>
        ))}
      </div>

      {/* ======================= */}
      {/* VERSIÓN DESKTOP (Marquee) */}
      {/* ======================= */}
      <div className="hidden md:flex w-full overflow-x-clip overflow-y-visible flex-col gap-6 py-12 relative z-10">
        {/* Fila 1: Marquee a la izquierda */}
        <div className="relative flex w-full">
          <div className="flex w-max gap-4 animate-marquee-left">
            {ROW_1_VIDEOS.map((videoSrc, index) => (
              <div 
                key={`row1-${index}`}
                onClick={() => setActiveVideo(videoSrc)}
                className="w-[250px] h-[450px] shrink-0 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5 bg-brand-surface transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] hover:border-brand-cyan/50 hover:z-10 relative cursor-pointer group/card"
              >
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                  <div className="w-16 h-16 bg-brand-cyan/20 backdrop-blur-md rounded-full flex items-center justify-center border border-brand-cyan/50 shadow-[0_0_20px_rgba(56,189,248,0.5)]">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <Image
                  src={videoSrc.replace('.mp4', '-thumbnail.webp')}
                  alt="Reel thumbnail"
                  fill
                  sizes="250px"
                  loading="lazy"
                  className="object-cover pointer-events-none relative z-10"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Fila 2: Marquee a la derecha */}
        <div className="relative flex w-full">
          <div className="flex w-max gap-4 animate-marquee-right">
            {ROW_2_VIDEOS.map((videoSrc, index) => (
              <div 
                key={`row2-${index}`}
                onClick={() => setActiveVideo(videoSrc)}
                className="w-[250px] h-[450px] shrink-0 rounded-2xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/5 bg-brand-surface transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] hover:border-brand-cyan/50 hover:z-10 relative cursor-pointer group/card"
              >
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                  <div className="w-16 h-16 bg-brand-cyan/20 backdrop-blur-md rounded-full flex items-center justify-center border border-brand-cyan/50 shadow-[0_0_20px_rgba(56,189,248,0.5)]">
                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                <Image
                  src={videoSrc.replace('.mp4', '-thumbnail.webp')}
                  alt="Reel thumbnail"
                  fill
                  sizes="250px"
                  loading="lazy"
                  className="object-cover pointer-events-none relative z-10"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal para ver el video completo */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveVideo(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-pure/90 backdrop-blur-xl p-4"
          >
            {/* Botón de cerrar */}
            <button 
              onClick={() => setActiveVideo(null)}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors border border-white/20 z-50 text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(56,189,248,0.3)] border border-brand-cyan/30"
            >
              <video
                src={activeVideo}
                autoPlay
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

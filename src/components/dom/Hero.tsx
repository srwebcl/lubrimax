"use client";

import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Link from 'next/link';

gsap.registerPlugin(useGSAP);

export default function Hero() {
  const container = useRef<HTMLElement>(null);

  // Animaciones de Entrada (Realce) con GSAP
  useGSAP(() => {
    const tl = gsap.timeline({ delay: 0.2 });

    // Animación de los videos iniciales
    tl.to(".hero-video-layer", {
      opacity: 1,
      duration: 2,
      ease: "power2.inOut"
    }, 0);

    // Animación "Fuera de Serie" (2D Cinematic Snap) - Sin bugs gráficos
    tl.fromTo(".hero-title-line",
      { y: 120, scale: 1.4, opacity: 0, skewY: 5, transformOrigin: "0% 50%" },
      { y: 0, scale: 1, opacity: 1, skewY: 0, duration: 1.6, stagger: 0.15, ease: "expo.out" },
      0.5
    );

    // Fade in del párrafo
    tl.fromTo(".hero-desc",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power2.out" },
      1.2
    );

    // Escala y rebote de los botones
    tl.fromTo(".hero-btn",
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.2, stagger: 0.15, ease: "back.out(1.7)" },
      1.5
    );

  }, { scope: container });

  return (
    <section ref={container} className="relative h-[100svh] w-full overflow-hidden flex items-center pt-20 bg-brand-pure">

      {/* Capa 1: Video Background Estático de Alta Calidad (GSAP fade in) */}
      <div className="absolute inset-0 z-0 bg-brand-pure hero-video-layer opacity-0">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.7) contrast(1.1)" }}
          src="/hero-bg-optimized.mp4"
          poster="/hero-poster.webp"
          autoPlay
          loop
          muted
          playsInline
        />
      </div>

      {/* Capa 2: Viñeta y Gradientes para legibilidad y estética Dark */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-pure via-transparent to-brand-pure/50 z-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-brand-pure/90 via-brand-pure/60 to-transparent z-20 pointer-events-none" />

      {/* Capa 3: Resplandor Ambiental Neón */}
      <div className="absolute top-1/2 left-0 md:left-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-brand-blue/20 rounded-full blur-[100px] md:blur-[120px] -translate-y-1/2 -z-10 animate-pulse pointer-events-none mix-blend-screen" />
      <div className="absolute top-1/2 right-0 md:left-1/3 w-[300px] h-[300px] bg-brand-cyan/20 rounded-full blur-[90px] -translate-y-1/2 -z-10 animate-pulse pointer-events-none mix-blend-screen" style={{ animationDelay: '1s' }} />

      {/* Capa 4: Contenido DOM */}
      <div className="relative z-30 container mx-auto px-4 lg:px-8 flex flex-col justify-center items-center text-center pointer-events-none h-full py-10 -mt-24 md:-mt-32">

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-widest text-zinc-100 leading-[1.05] mb-4 md:mb-6 flex flex-col items-center text-center">
          <div className="mb-2 w-full flex justify-center">
            <div className="hero-title-line opacity-0 will-change-transform uppercase text-xs sm:text-sm md:text-base tracking-[0.3em] font-semibold text-zinc-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">CLÍNICA DE</div>
          </div>
          <div className="flex gap-2 sm:gap-4 md:gap-5 justify-center flex-wrap px-2">
            <div className="hero-title-line opacity-0 will-change-transform uppercase text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue drop-shadow-[0_0_15px_rgba(56,189,248,0.5)] pb-1">ESTÉTICA</div>
            <div className="hero-title-line opacity-0 will-change-transform uppercase text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-white to-gray-500 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] pb-1">AUTOMOTRIZ</div>
          </div>
        </h1>

        <p className="hero-desc opacity-0 will-change-transform text-sm sm:text-base md:text-lg text-gray-300 mb-6 md:mb-8 max-w-lg mx-auto font-medium tracking-wide drop-shadow-md pointer-events-auto">
          Detailing premium, sellado cerámico y pulido de alto nivel. Elevamos tu vehículo al estándar de exhibición.
        </p>

        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/agendar"
              prefetch={false}
              className="hero-btn opacity-0 will-change-transform inline-block pointer-events-auto relative overflow-hidden bg-brand-pure/40 backdrop-blur-md border border-brand-cyan/50 text-white font-bold text-sm px-5 py-2 md:px-6 md:py-3 uppercase tracking-widest rounded-sm group shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(56,189,248,0.5)] active:scale-95"
            >
              <span className="relative z-10 drop-shadow-[0_0_5px_rgba(255,255,255,0.6)]">Agendar Cita</span>
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/40 to-brand-cyan/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </Link>

            <Link
              href="/#servicios"
              prefetch={false}
              className="hero-btn opacity-0 will-change-transform inline-block pointer-events-auto relative overflow-hidden bg-transparent border border-white/20 text-white font-bold text-sm px-5 py-2 md:px-6 md:py-3 uppercase tracking-widest rounded-sm transition-all hover:bg-white/10 hover:border-white/50 active:scale-95"
            >
              <span className="relative z-10">Servicios</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

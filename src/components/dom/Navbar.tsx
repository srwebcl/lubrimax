"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="w-full bg-brand-pure/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo oficial */}
          <div className="flex-shrink-0">
            <Link href="/" className="block transition-transform hover:scale-105 active:scale-95">
              <Image 
                src="/logo-lubrimax.webp" 
                alt="Lubrimax" 
                width={180} 
                height={50} 
                className="h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              />
            </Link>
          </div>
          
          {/* Enlaces (Desktop) */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link href="/#inicio" className="text-brand-chrome hover:text-white transition-colors duration-300">
                Inicio
              </Link>
              <Link href="/#resultados" className="text-brand-chrome hover:text-white transition-colors duration-300">
                Resultados
              </Link>
              <Link href="/#servicios" className="text-brand-chrome hover:text-white transition-colors duration-300">
                Servicios
              </Link>
              <Link href="/#contacto" className="text-brand-chrome hover:text-white transition-colors duration-300">
                Contacto
              </Link>
            </div>
          </div>
          
          {/* Botón CTA */}
          <div>
            <Link href="/agendar" className="relative overflow-hidden inline-block bg-transparent border border-white/10 text-brand-chrome font-bold px-6 py-2 lg:px-8 lg:py-3 uppercase tracking-widest rounded-sm group hover:border-brand-blue transition-colors duration-300">
              <span className="relative z-10">Agendar Cita</span>
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-cyan opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            </Link>
          </div>

        </div>
      </div>
    </nav>
  );
}

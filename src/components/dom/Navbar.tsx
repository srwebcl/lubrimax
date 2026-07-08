"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/components/providers/CartProvider';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { itemCount, openCart } = useCart();

  return (
    <nav className="w-full bg-brand-pure/80 backdrop-blur-md border-b border-white/5 relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo oficial */}
          <div className="flex-shrink-0">
            <Link href="/" className="block transition-transform hover:scale-105 active:scale-95">
              <Image 
                src="/logo-lubrimax.webp" 
                alt="Lubrimax" 
                width={150} 
                height={40} 
                className="h-8 md:h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              />
            </Link>
          </div>
          
          {/* Enlaces (Desktop) */}
          <div className="hidden md:flex ml-10 items-baseline space-x-8">
            <Link href="/#inicio" className="text-brand-chrome hover:text-white transition-colors duration-300">
              Inicio
            </Link>
            <Link href="/#servicios" className="text-brand-chrome hover:text-white transition-colors duration-300">
              Servicios
            </Link>
            <Link href="/tienda" className="text-brand-cyan hover:text-white transition-colors duration-300 font-bold">
              Tienda
            </Link>
            <Link href="/club" className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-300 hover:to-yellow-500 transition-colors duration-300 font-bold uppercase tracking-widest text-[10px]">
              ★ Club VIP
            </Link>
          </div>
          
          {/* Botón CTA, Perfil y Menú Hamburguesa */}
          <div className="flex items-center gap-3">
            
            <Link href="/perfil" className="text-gray-400 hover:text-white transition-colors p-2 hidden sm:block" title="Mi Cuenta">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>

            <button onClick={openCart} className="text-gray-400 hover:text-white transition-colors p-2 relative" title="Ver Carrito">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} key={itemCount}
                    className="absolute top-0 right-0 bg-brand-cyan text-brand-pure text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <Link href="/agendar" className="relative overflow-hidden inline-block bg-transparent border border-white/10 text-brand-chrome font-bold px-3 py-2 text-[10px] sm:text-xs md:text-sm md:px-6 md:py-2 lg:px-8 lg:py-3 uppercase tracking-widest whitespace-nowrap rounded-sm group hover:border-brand-blue transition-colors duration-300">
              <span className="relative z-10">Agendar</span>
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-cyan opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
            </Link>
            
            {/* Hamburger Button (Mobile) */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-brand-chrome hover:text-white focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Menú Desplegable Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-brand-pure/95 backdrop-blur-lg border-b border-white/10 shadow-xl">
          <div className="px-4 pt-2 pb-6 space-y-1 flex flex-col">
            <Link href="/#inicio" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-4 text-base font-medium text-brand-chrome hover:text-white hover:bg-white/5 rounded-md transition-colors">
              Inicio
            </Link>
            <Link href="/#servicios" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-4 text-base font-medium text-brand-chrome hover:text-white hover:bg-white/5 rounded-md transition-colors">
              Servicios
            </Link>
            <Link href="/tienda" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-4 text-base font-medium text-brand-cyan hover:text-white hover:bg-white/5 rounded-md transition-colors">
              Tienda
            </Link>
            <Link href="/club" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-4 text-base font-medium text-amber-500 hover:text-amber-400 hover:bg-white/5 rounded-md transition-colors uppercase tracking-widest">
              ★ Club VIP
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

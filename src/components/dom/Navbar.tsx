"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCart } from '@/components/providers/CartProvider';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path || (path !== "/" && pathname.startsWith(path));

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
                priority={true}
                style={{ width: 'auto', height: 'auto' }}
                className="h-8 md:h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              />
            </Link>
          </div>
          
          {/* Enlaces (Desktop) */}
          <div className="hidden lg:flex ml-10 items-center space-x-8">
            <Link href="/" className={`${isActive("/") ? "text-brand-cyan font-bold" : "text-gray-300 hover:text-white"} transition-colors duration-300 font-medium text-sm uppercase tracking-wider`}>
              Inicio
            </Link>
            
            <div className="relative group">
              <Link href="/#servicios" className={`${pathname.includes("/servicios") ? "text-brand-cyan font-bold" : "text-gray-300 hover:text-white"} transition-colors duration-300 font-medium py-4 flex items-center gap-1 text-sm uppercase tracking-wider`}>
                Servicios
                <svg className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </Link>
              {/* Mega Menú */}
              <div className="absolute top-[80%] left-1/2 -translate-x-1/2 mt-2 pt-4 w-[600px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                <div className="bg-brand-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden p-6 grid grid-cols-2 gap-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 to-transparent pointer-events-none" />
                  
                  {/* Lavados */}
                  <Link href="/servicios/lavados" className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 relative z-10">
                    <div className="w-16 h-16 rounded-lg overflow-hidden relative shadow-lg">
                      <Image src="https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80" alt="Lavados" fill sizes="64px" className="object-cover group-hover/item:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold uppercase tracking-wide text-sm group-hover/item:text-brand-cyan transition-colors">Lavados</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-tight">Limpieza extrema y cuidado al detalle.</p>
                    </div>
                  </Link>

                  {/* Detailing */}
                  <Link href="/servicios/detailing" className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 relative z-10">
                    <div className="w-16 h-16 rounded-lg overflow-hidden relative shadow-lg">
                      <Image src="https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80" alt="Detailing" fill sizes="64px" className="object-cover group-hover/item:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold uppercase tracking-wide text-sm group-hover/item:text-brand-cyan transition-colors">Detailing</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-tight">Corrección de pintura y sellado cerámico.</p>
                    </div>
                  </Link>

                  {/* Extras */}
                  <Link href="/servicios/extras" className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 relative z-10">
                    <div className="w-16 h-16 rounded-lg overflow-hidden relative shadow-lg">
                      <Image src="https://images.unsplash.com/photo-1518987048-93e29699e79a?auto=format&fit=crop&q=80" alt="Extras" fill sizes="64px" className="object-cover group-hover/item:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold uppercase tracking-wide text-sm group-hover/item:text-brand-cyan transition-colors">Extras</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-tight">Lavado de tapiz, motor, chasis y más.</p>
                    </div>
                  </Link>

                  {/* Mecánica */}
                  <Link href="/servicios/mecanica" className="group/item flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 relative z-10">
                    <div className="w-16 h-16 rounded-lg overflow-hidden relative shadow-lg">
                      <Image src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80" alt="Mecánica" fill sizes="64px" className="object-cover group-hover/item:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold uppercase tracking-wide text-sm group-hover/item:text-brand-cyan transition-colors">Mecánica</h4>
                      <p className="text-xs text-gray-400 mt-1 leading-tight">Mantenimiento preventivo integral.</p>
                    </div>
                  </Link>

                </div>
              </div>
            </div>

            <Link href="/tienda" className={`${isActive("/tienda") ? "text-brand-cyan font-bold" : "text-gray-300 hover:text-white"} transition-colors duration-300 font-medium text-sm uppercase tracking-wider`}>
              Tienda
            </Link>

            <Link href="/contacto" className={`${isActive("/contacto") ? "text-brand-cyan font-bold" : "text-gray-300 hover:text-white"} transition-colors duration-300 font-medium text-sm uppercase tracking-wider`}>
              Contacto
            </Link>
            
            <Link href="/club" className="relative group/vip overflow-hidden px-5 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-300 flex items-center shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 font-bold uppercase tracking-widest text-sm drop-shadow-md">★ Club VIP</span>
              <div className="absolute inset-0 bg-amber-400/20 blur-xl opacity-0 group-hover/vip:opacity-100 transition-opacity duration-500" />
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
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-brand-chrome hover:text-white hover:bg-white/5 rounded-md transition-colors">
              Inicio
            </Link>
            
            <div className="px-3 py-2">
              <Link href="/#servicios" onClick={() => setIsMobileMenuOpen(false)} className="block text-base font-medium text-brand-chrome hover:text-white transition-colors mb-2">
                Servicios
              </Link>
              <div className="pl-4 border-l border-white/10 flex flex-col space-y-2">
                <Link href="/servicios/lavados" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-gray-400 hover:text-white transition-colors">Lavados</Link>
                <Link href="/servicios/detailing" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-gray-400 hover:text-white transition-colors">Detailing</Link>
                <Link href="/servicios/extras" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-gray-400 hover:text-white transition-colors">Extras</Link>
                <Link href="/servicios/mecanica" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-gray-400 hover:text-white transition-colors">Mecánica</Link>
              </div>
            </div>

            <Link href="/tienda" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-brand-cyan hover:text-white hover:bg-white/5 rounded-md transition-colors">
              Tienda
            </Link>
            
            <Link href="/contacto" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-brand-chrome hover:text-white hover:bg-white/5 rounded-md transition-colors">
              Contacto
            </Link>
            <Link href="/club" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-amber-500 hover:text-amber-400 hover:bg-white/5 rounded-md transition-colors">
              ★ Club VIP
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { logout } from "@/actions/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Si estamos en el login, no mostramos el menú lateral
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navCategories = [
    {
      title: "Servicios & Reservas",
      items: [
        { name: "Agenda", href: "/admin", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
        { name: "Catálogo Serv.", href: "/admin/servicios", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
        { name: "Club Lubrimax", href: "/admin/club", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
      ]
    },
    {
      title: "Tienda (E-Commerce)",
      items: [
        { name: "Pedidos", href: "/admin/pedidos", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" },
        { name: "Productos", href: "/admin/tienda", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
        { name: "Cupones", href: "/admin/cupones", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
      ]
    },
    {
      title: "Configuración",
      items: [
        { name: "Ajustes", href: "/admin/configuracion", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
      ]
    }
  ];

  const flatNavItems = navCategories.flatMap(cat => cat.items);

  return (
    <div className="min-h-screen bg-brand-pure flex">
      {/* Sidebar Fijo */}
      <aside className="w-64 bg-brand-surface border-r border-white/5 hidden md:flex flex-col">
        <div className="p-6 border-b border-white/5 text-center">
          <Link href="/admin" className="flex justify-center items-center">
            <Image 
              src="/logo-lubrimax.webp" 
              alt="Lubrimax Admin" 
              width={120} 
              height={32} 
              className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]"
            />
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
          {navCategories.map((category) => (
            <div key={category.title}>
              <h3 className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                {category.title}
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href}
                      className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm uppercase tracking-widest font-bold transition-all ${
                        isActive 
                          ? "bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20" 
                          : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                      </svg>
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => logout()}
            className="w-full flex items-center justify-center space-x-2 text-gray-500 hover:text-red-400 text-sm uppercase tracking-widest font-bold py-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Navegación Móvil Inferior */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-brand-surface/95 backdrop-blur-md border-t border-white/10 z-50 pb-safe">
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 custom-scrollbar">
          {flatNavItems.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 min-w-[72px] flex-shrink-0 transition-colors ${
                pathname === item.href ? "text-brand-cyan" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className="text-[9px] uppercase font-bold text-center leading-tight truncate w-full">{item.name}</span>
            </Link>
          ))}
          <Link 
            href="/admin/perfil"
            className={`flex flex-col items-center justify-center p-2 min-w-[72px] flex-shrink-0 transition-colors ${
              pathname === '/admin/perfil' ? "text-brand-cyan" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[9px] uppercase font-bold text-center leading-tight truncate w-full">Perfil</span>
          </Link>
          <button 
            onClick={() => logout()}
            className="flex flex-col items-center justify-center p-2 min-w-[72px] flex-shrink-0 transition-colors text-red-500/70 hover:text-red-400"
          >
            <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-[9px] uppercase font-bold text-center leading-tight truncate w-full">Salir</span>
          </button>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="flex-1 h-screen overflow-y-auto pb-20 md:pb-0 flex flex-col relative">
        {/* Top Header Admin */}
        <header className="sticky top-0 z-40 bg-brand-surface/90 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 py-3 flex justify-between md:justify-end items-center gap-4">
          <div className="md:hidden flex items-center">
            <Image 
              src="/logo-lubrimax.webp" 
              alt="Lubrimax Admin" 
              width={90} 
              height={24} 
              className="h-6 w-auto object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]"
            />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin/perfil" className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-lg transition-colors group">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-white leading-none group-hover:text-brand-cyan transition-colors">Administrador</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Tu Perfil</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-blue to-brand-cyan flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                A
              </div>
            </Link>
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { logout } from "@/actions/auth";

type Role = "ADMIN" | "WORKER";

type Dest = { name: string; href: string; icon: string; adminOnly?: boolean };

const ICONS = {
  agenda:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  catalogo:
    "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  categorias:
    "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
  club: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  pedidos:
    "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  productos:
    "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  cupones:
    "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
  ajustes: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  usuarios:
    "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3.5-6",
  ingreso:
    "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0",
  perfil: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  mas: "M4 6h16M4 12h16M4 18h16",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
} as const;

// Todos los destinos del panel, en orden.
const DESTS: Dest[] = [
  { name: "Agenda", href: "/admin", icon: ICONS.agenda },
  { name: "Ingreso", href: "/admin/ingreso", icon: ICONS.ingreso },
  { name: "Productos", href: "/admin/tienda", icon: ICONS.productos, adminOnly: true },
  { name: "Pedidos", href: "/admin/pedidos", icon: ICONS.pedidos, adminOnly: true },
  { name: "Catálogo", href: "/admin/servicios", icon: ICONS.catalogo, adminOnly: true },
  { name: "Categorías", href: "/admin/categorias", icon: ICONS.categorias, adminOnly: true },
  { name: "Club Lubrimax", href: "/admin/club", icon: ICONS.club, adminOnly: true },
  { name: "Cupones", href: "/admin/cupones", icon: ICONS.cupones, adminOnly: true },
  { name: "Ajustes", href: "/admin/configuracion", icon: ICONS.ajustes, adminOnly: true },
  { name: "Usuarios", href: "/admin/usuarios", icon: ICONS.usuarios, adminOnly: true },
  { name: "Mi perfil", href: "/admin/perfil", icon: ICONS.perfil },
];

function Icon({ d, className = "w-6 h-6" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  );
}

export default function AdminShell({
  role,
  staffName,
  children,
}: {
  role: Role;
  staffName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const visible = DESTS.filter((d) => role === "ADMIN" || !d.adminOnly);
  const initial = staffName.trim().charAt(0).toUpperCase() || "?";
  const roleLabel = role === "ADMIN" ? "Administrador" : "Trabajador";

  // Barra inferior: máx. 4 accesos fijos + "Más" cuando sobra.
  const primary =
    role === "ADMIN"
      ? visible.filter((d) =>
          ["/admin", "/admin/ingreso", "/admin/pedidos"].includes(d.href)
        )
      : visible.filter((d) =>
          ["/admin", "/admin/ingreso", "/admin/perfil"].includes(d.href)
        );

  const inSheet =
    role === "ADMIN"
      ? visible.filter((d) => !primary.some((p) => p.href === d.href))
      : [];

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="h-[100dvh] bg-brand-pure flex overflow-hidden">
      {/* ───────────── Sidebar (escritorio) ───────────── */}
      <aside className="w-60 h-full bg-brand-surface border-r border-white/5 hidden md:flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5">
          <Link href="/admin" className="flex justify-center">
            <Image
              src="/logo-lubrimax.webp"
              alt="Lubrimax"
              width={120}
              height={32}
              className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]"
            />
          </Link>
        </div>
        <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto custom-scrollbar">
          {visible.map((d) => {
            const active = isActive(d.href);
            return (
              <Link
                key={d.href}
                href={d.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  active
                    ? "bg-brand-cyan/10 text-brand-cyan"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon d={d.icon} className="w-5 h-5" />
                <span>{d.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <Icon d={ICONS.logout} className="w-5 h-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ───────────── Área principal ───────────── */}
      {/* min-h-0 es la clave: sin esto, un hijo flex-1 no se acota a la
          altura del contenedor y `overflow-y-auto` de `main` nunca activa un
          scroll interno — la pantalla queda "cortada" y sin poder scrollear
          (justo el bug reportado en escritorio). */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full">
        {/* Top bar — chrome mínimo; cada pantalla pone su propio título */}
        <header className="shrink-0 sticky top-0 z-40 bg-brand-surface/80 backdrop-blur-xl border-b border-white/5 pt-safe">
          <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
            <Image
              src="/logo-lubrimax.webp"
              alt="Lubrimax"
              width={80}
              height={22}
              className="h-5 w-auto object-contain md:hidden shrink-0"
            />
            <span className="hidden md:block" />
            <Link
              href="/admin/perfil"
              aria-label="Mi perfil"
              className="flex items-center gap-2.5 rounded-full pl-2.5 pr-1 py-1 hover:bg-white/5 transition-colors"
            >
              <span className="hidden sm:block text-right leading-tight">
                <span className="block text-xs font-bold text-white">{staffName}</span>
                <span className="block text-[10px] text-gray-500 uppercase tracking-wider">
                  {roleLabel}
                </span>
              </span>
              <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-cyan flex items-center justify-center text-white text-sm font-bold">
                {initial}
              </span>
            </Link>
          </div>
        </header>

        {/* Contenido — único elemento que scrollea; con espacio para la tab bar en móvil */}
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-[calc(4.5rem_+_env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>

      {/* ───────────── Tab bar (móvil) ───────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-brand-surface/90 backdrop-blur-xl border-t border-white/10 pb-safe">
        <div className="flex items-stretch h-[4.5rem]">
          {primary.map((d) => {
            const active = isActive(d.href);
            return (
              <Link
                key={d.href}
                href={d.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 relative ${
                  active ? "text-brand-cyan" : "text-gray-500"
                }`}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-cyan" />
                )}
                <Icon d={d.icon} className="w-6 h-6" />
                <span className="text-[10px] font-semibold tracking-tight">{d.name}</span>
              </Link>
            );
          })}
          {inSheet.length > 0 && (
            <button
              onClick={() => setSheetOpen(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 ${
                inSheet.some((d) => isActive(d.href)) ? "text-brand-cyan" : "text-gray-500"
              }`}
            >
              <Icon d={ICONS.mas} className="w-6 h-6" />
              <span className="text-[10px] font-semibold tracking-tight">Más</span>
            </button>
          )}
        </div>
      </nav>

      {/* ───────────── Bottom sheet "Más" ───────────── */}
      <AnimatePresence>
        {sheetOpen && (
          <div className="md:hidden fixed inset-0 z-[60]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="absolute bottom-0 inset-x-0 bg-brand-surface border-t border-white/10 rounded-t-3xl pb-safe max-h-[80dvh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <span className="w-10 h-1.5 rounded-full bg-white/15" />
              </div>
              <div className="px-4 pt-2 pb-6">
                <div className="grid grid-cols-3 gap-2">
                  {inSheet.map((d) => {
                    const active = isActive(d.href);
                    return (
                      <Link
                        key={d.href}
                        href={d.href}
                        onClick={() => setSheetOpen(false)}
                        className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border text-center ${
                          active
                            ? "bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan"
                            : "bg-white/[0.03] border-white/5 text-gray-300"
                        }`}
                      >
                        <Icon d={d.icon} className="w-6 h-6" />
                        <span className="text-[11px] font-semibold leading-tight">{d.name}</span>
                      </Link>
                    );
                  })}
                </div>
                <button
                  onClick={() => logout()}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-500/20 text-red-400 font-semibold text-sm"
                >
                  <Icon d={ICONS.logout} className="w-5 h-5" />
                  Cerrar sesión
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

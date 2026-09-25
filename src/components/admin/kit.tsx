"use client";

// Kit de UI del panel — un solo lenguaje visual "de aplicación" para todas
// las pantallas de gestión. Tipografía normal (sin itálicas ni
// tracking-widest de marketing), tarjetas planas, hojas inferiores para los
// formularios, feedback táctil.

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

/* ---------- clases compartidas ---------- */
export const INPUT =
  "w-full rounded-xl border border-white/10 bg-white/[0.02] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] px-3.5 py-3 text-[15px] text-white placeholder-gray-600 focus:border-brand-cyan focus:bg-white/[0.05] focus:ring-1 focus:ring-brand-cyan/50 focus:outline-none transition-all duration-300";
export const LABEL =
  "block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5";
export const CARD = "rounded-2xl border border-white/8 bg-brand-surface p-4";

/* ---------- contenedor de pantalla ---------- */
const SCREEN_WIDTH = {
  md: "max-w-2xl",
  lg: "max-w-3xl",
  // Para pantallas densas en datos (listados tipo tienda/pedidos en
  // escritorio) donde una tabla necesita más aire.
  xl: "max-w-6xl",
} as const;

export function Screen({
  children,
  size = "md",
}: {
  children: React.ReactNode;
  size?: keyof typeof SCREEN_WIDTH;
}) {
  return (
    <div className={`mx-auto w-full px-4 py-5 space-y-5 ${SCREEN_WIDTH[size]}`}>
      {children}
    </div>
  );
}

/* ---------- encabezado de pantalla ---------- */
export function PageHead({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-bold tracking-tight text-white">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---------- botones ---------- */
export function PrimaryBtn({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-xl bg-gradient-to-r from-brand-cyan to-[#00b3cc] shadow-[0_0_15px_rgba(0,255,255,0.15)] text-black text-sm font-extrabold disabled:opacity-50 hover:shadow-[0_0_25px_rgba(0,255,255,0.4)] hover:-translate-y-0.5 transition-all duration-300 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-white/12 bg-white/[0.03] text-gray-200 text-sm font-semibold disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/** Botón redondo "+" para el encabezado. */
export function AddBtn({
  label = "Nuevo",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-10 pl-3 pr-4 rounded-full bg-brand-cyan text-brand-pure text-sm font-bold"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeWidth={2.5} d="M12 5v14M5 12h14" />
      </svg>
      {label}
    </button>
  );
}

/* ---------- hoja inferior (formularios) ---------- */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
          />
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative w-full max-w-2xl bg-gradient-to-b from-[#1a1a24] to-[#0a0a0f] border border-white/10 rounded-t-3xl md:rounded-3xl max-h-[92dvh] flex flex-col pb-safe shadow-[0_0_50px_rgba(0,0,0,0.5)] pointer-events-auto"
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0 bg-white/[0.02]">
              <div className="flex-1 flex justify-center absolute inset-x-0 -top-0 pt-2 pointer-events-none md:hidden">
                <span className="w-10 h-1.5 rounded-full bg-white/15" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight pt-1">{title}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 text-gray-400 hover:text-white hover:bg-brand-cyan/20 transition-colors flex items-center justify-center"
                aria-label="Cerrar"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-6 py-6 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- mensajitos ---------- */
export function Msg({
  kind,
  children,
}: {
  kind: "ok" | "err";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`p-3 rounded-xl text-sm font-semibold border ${
        kind === "ok"
          ? "bg-green-500/10 text-green-400 border-green-500/25"
          : "bg-red-500/10 text-red-400 border-red-500/25"
      }`}
    >
      {children}
    </div>
  );
}

/* ---------- estados ---------- */
export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-7 h-7 border-[3px] border-white/15 border-t-brand-cyan rounded-full animate-spin" />
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-16 text-sm text-gray-500">{children}</div>
  );
}

/* ---------- campo etiqueta + control ---------- */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}

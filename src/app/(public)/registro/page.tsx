"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { registerCustomer } from "@/actions/customer-auth";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/perfil";
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerCustomer(formData);

    if (result.success) {
      router.push(callbackUrl);
      router.refresh();
    } else {
      setError(result.error || "Error al registrar cuenta.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-brand-surface border border-white/10 rounded-2xl p-8 backdrop-blur-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest italic mb-2">Crear Cuenta</h1>
          <p className="text-gray-400 text-sm">Únete para acceder al Club LUBRIMAX y gestionar tus reservas.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Nombre Completo</label>
            <input 
              type="text" 
              name="name" 
              required 
              placeholder="Ej. Juan Pérez"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Correo Electrónico</label>
            <input 
              type="email" 
              name="email" 
              required 
              placeholder="tu@correo.com"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Contraseña</label>
            <input 
              type="password" 
              name="password" 
              required 
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm py-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50 mt-4 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
          >
            {loading ? "Creando..." : "Crear Mi Cuenta"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-gray-400 text-sm">
            ¿Ya tienes cuenta? <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-brand-cyan hover:text-white transition-colors font-bold">Inicia sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-32 pb-20 flex items-center justify-center text-white">Cargando...</div>}>
      <RegisterContent />
    </Suspense>
  );
}

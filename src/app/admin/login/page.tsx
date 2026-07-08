"use client";

import React, { useState } from "react";
import Image from "next/image";
import { login } from "@/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    
    // Si result existe, es porque devolvió un error (si tiene éxito, Next.js hace un redirect internamente)
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-pure flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos decorativos */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-cyan/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue opacity-50" />

      <div className="w-full max-w-md bg-brand-surface/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image 
              src="/logo-lubrimax.webp" 
              alt="Lubrimax Admin" 
              width={160} 
              height={45} 
              className="h-10 w-auto object-contain drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]"
            />
          </div>
          <p className="text-brand-cyan text-xs uppercase tracking-widest font-bold">Acceso Restringido</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Usuario</label>
            <input 
              type="text"
              name="username"
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Contraseña</label>
            <input 
              type="password"
              name="password"
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm px-4 py-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm py-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
          >
            {loading ? "Autenticando..." : "Ingresar al Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}

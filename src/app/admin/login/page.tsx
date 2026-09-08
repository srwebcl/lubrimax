"use client";

import React, { useState } from "react";
import Image from "next/image";
import { login } from "@/actions/auth";
import InstallCard from "@/components/pwa/InstallCard";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-brand-pure flex flex-col justify-center px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex flex-col items-center mb-10">
          <Image
            src="/logo-lubrimax.webp"
            alt="Lubrimax"
            width={180}
            height={48}
            priority
            className="h-11 w-auto object-contain drop-shadow-[0_0_25px_rgba(56,189,248,0.35)]"
          />
          <p className="text-gray-500 text-xs uppercase tracking-[0.2em] font-bold mt-4">
            Panel de operaciones
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            required
            placeholder="Correo"
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan"
          />
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="Contraseña"
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan"
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-2xl text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm py-4 rounded-2xl disabled:opacity-50"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="mt-6">
          <InstallCard />
        </div>

        <p className="text-center text-gray-600 text-xs mt-8">LUBRIMAX · La Serena</p>
      </div>
    </div>
  );
}

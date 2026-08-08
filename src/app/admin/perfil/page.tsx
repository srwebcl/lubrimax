"use client";

import React, { useState } from "react";
import { logout } from "@/actions/auth";

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-white uppercase tracking-widest italic">Tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">Perfil</span></h2>
        <p className="text-gray-400 text-sm mt-2">Configuración y seguridad de la cuenta de administrador.</p>
      </div>

      <div className="bg-brand-surface/80 border border-white/10 p-6 sm:p-8 rounded-2xl relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>

        <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 w-full md:w-1/3">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-brand-blue to-brand-cyan p-[2px] shadow-[0_0_30px_rgba(56,189,248,0.2)]">
              <div className="w-full h-full bg-brand-surface rounded-full flex items-center justify-center">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">A</span>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-white uppercase tracking-widest">Administrador</h3>
              <p className="text-brand-cyan text-xs font-bold uppercase tracking-widest mt-1">Super Admin</p>
            </div>
            
            <button 
              onClick={() => logout()}
              className="mt-4 w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors font-bold uppercase text-xs tracking-widest"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Cerrar Sesión
            </button>
          </div>

          {/* Settings Section */}
          <div className="flex-1 w-full space-y-6">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest font-bold border-b border-white/5 pb-2">Credenciales de Acceso</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Usuario</label>
                <input 
                  type="text" 
                  readOnly 
                  value="admin (Gestionado por Entorno)" 
                  className="w-full bg-black/30 border border-white/5 rounded-lg px-4 py-3 text-gray-500 cursor-not-allowed font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Contraseña</label>
                <input 
                  type="password" 
                  readOnly 
                  value="••••••••••••••••" 
                  className="w-full bg-black/30 border border-white/5 rounded-lg px-4 py-3 text-gray-500 cursor-not-allowed font-mono text-sm"
                />
              </div>
            </div>

            <div className="bg-brand-cyan/10 border border-brand-cyan/20 p-4 rounded-xl mt-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-brand-cyan mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-brand-cyan text-xs font-bold uppercase tracking-widest mb-1">Información de Seguridad</h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    Por motivos de alta seguridad, las credenciales del panel de control de Lubrimax no están almacenadas en la base de datos y no pueden ser modificadas desde esta interfaz. 
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed mt-2">
                    Para cambiar el usuario o contraseña, debes editar las variables <code className="text-white bg-black/50 px-1 py-0.5 rounded">ADMIN_USER</code> y <code className="text-white bg-black/50 px-1 py-0.5 rounded">ADMIN_PASSWORD</code> directamente en el archivo <strong>.env</strong> de tu servidor o en la configuración de Vercel.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

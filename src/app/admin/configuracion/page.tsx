"use client";

import React, { useState, useEffect } from "react";
import { getSettings, updateSettings } from "@/actions/admin-settings";

export default function ConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [concurrentBays, setConcurrentBays] = useState(1);
  const [slotInterval, setSlotInterval] = useState(30);

  useEffect(() => {
    getSettings().then((settings) => {
      setStartHour(settings.workStartHour);
      setEndHour(settings.workEndHour);
      setConcurrentBays(settings.concurrentBays || 1);
      setSlotInterval(settings.slotInterval || 30);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    const formData = new FormData();
    formData.append("workStartHour", startHour.toString());
    formData.append("workEndHour", endHour.toString());
    formData.append("concurrentBays", concurrentBays.toString());
    formData.append("slotInterval", slotInterval.toString());

    const result = await updateSettings(formData);
    
    if (result.success) {
      setMessage({ type: "success", text: "Horarios actualizados exitosamente." });
    } else {
      setMessage({ type: "error", text: result.error || "Ocurrió un error." });
    }
    
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-gray-400">Cargando configuración...</div>;
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 border-b border-white/10 pb-4">
        <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Configuración Global</h2>
        <p className="text-gray-400 text-sm mt-1">Administra los horarios de funcionamiento y parámetros generales de la clínica.</p>
      </div>

      <div className="max-w-2xl bg-brand-surface/50 border border-white/5 rounded-xl p-6 backdrop-blur-md">
        <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6">Horario de Operaciones</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Hora de Apertura</label>
              <div className="relative">
                <select 
                  value={startHour}
                  onChange={(e) => setStartHour(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={`start-${i}`} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Hora de Cierre</label>
              <div className="relative">
                <select 
                  value={endHour}
                  onChange={(e) => setEndHour(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={`end-${i}`} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6 mt-8 pt-6 border-t border-white/5">Capacidad Operativa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Plazas Simultáneas (Autos)</label>
              <div className="relative">
                <select 
                  value={concurrentBays}
                  onChange={(e) => setConcurrentBays(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors"
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <option key={`bay-${i}`} value={i + 1}>
                      {i + 1} {i === 0 ? "Auto" : "Autos"} al mismo tiempo
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Intervalo de Agenda</label>
              <div className="relative">
                <select 
                  value={slotInterval}
                  onChange={(e) => setSlotInterval(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors"
                >
                  <option value={15}>Cada 15 minutos</option>
                  <option value={30}>Cada 30 minutos</option>
                  <option value={60}>Cada 1 hora</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 italic mt-6">
            * Nota: Los cambios en el horario afectarán automáticamente los bloques disponibles en el formulario de reservas (BookingWizard) para los clientes.
          </p>

          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${
              message.type === "success" 
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button 
              type="submit"
              disabled={saving}
              className="bg-brand-cyan text-brand-pure px-6 py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar Configuración"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

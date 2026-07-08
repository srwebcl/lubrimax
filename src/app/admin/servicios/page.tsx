"use client";

import React, { useState, useEffect } from "react";
import { createService, deleteService, updateService } from "@/actions/admin-services";
import { getServices } from "@/actions/booking";
import { motion, AnimatePresence } from "framer-motion";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
  category: string;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    const data = await getServices();
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);
    
    let result;
    if (editingService) {
      result = await updateService(editingService.id, formData);
    } else {
      result = await createService(formData);
    }
    
    if (result.success) {
      setMessage({ type: "success", text: editingService ? "Servicio actualizado exitosamente." : "Servicio agregado exitosamente." });
      fetchServices();
      setTimeout(() => {
        setShowForm(false);
        setEditingService(null);
        setMessage(null);
      }, 2000);
    } else {
      setMessage({ type: "error", text: result.error || "Error al procesar la solicitud." });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este servicio? Esta acción es irreversible y fallará si existen reservas activas asociadas.")) return;
    
    const result = await deleteService(id);
    if (result.success) {
      fetchServices();
    } else {
      alert(result.error);
    }
  };

  const handleEdit = (svc: Service) => {
    setEditingService(svc);
    setShowForm(true);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingService(null);
    setMessage(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Detailing": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Lavados": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Servicios Especiales": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Mecánica": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20";
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="mb-8 border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase tracking-widest italic">Catálogo <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">de Servicios</span></h2>
          <p className="text-gray-400 text-sm mt-2">Administra los tratamientos, precios y duraciones disponibles para tus clientes.</p>
        </div>
        <button 
          onClick={() => showForm ? handleCancelForm() : setShowForm(true)}
          className="bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-white transition-colors shadow-[0_0_20px_rgba(56,189,248,0.2)] whitespace-nowrap"
        >
          {showForm ? "✕ Cancelar" : "➕ Nuevo Servicio"}
        </button>
      </div>

      {/* FORMULARIO DESPLEGABLE */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-b from-brand-surface to-brand-pure border border-brand-cyan/30 rounded-2xl p-6 sm:p-8 relative shadow-[0_0_30px_rgba(56,189,248,0.1)]">
              <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                {editingService ? `Editando: ${editingService.name}` : "Configurar Nuevo Tratamiento"}
              </h3>
              
              <form key={editingService ? editingService.id : "new"} onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Nombre del Servicio</label>
                    <input type="text" name="name" required defaultValue={editingService?.name || ""} placeholder="Ej. Sellado Cerámico 9H" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Categoría</label>
                    <div className="relative">
                      <select name="category" defaultValue={editingService?.category || "Detailing"} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all">
                        <option value="Detailing">Detailing</option>
                        <option value="Lavados">Lavados</option>
                        <option value="Servicios Especiales">Servicios Especiales</option>
                        <option value="Mecánica">Mecánica Básica</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Descripción (Opcional)</label>
                  <textarea name="description" rows={2} defaultValue={editingService?.description || ""} placeholder="Detalles de lo que incluye el servicio..." className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Duración (Mins)</label>
                    <input type="number" name="duration" required defaultValue={editingService?.duration || 60} step="15" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all text-center" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Precio Auto ($)</label>
                    <input type="number" name="priceAuto" defaultValue={editingService?.priceAuto || ""} placeholder="Ej. 15000" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all text-center" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Precio SUV (2 Corridas)</label>
                    <input type="number" name="priceSuv2" defaultValue={editingService?.priceSuv2 || ""} placeholder="Ej. 20000" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all text-center" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Precio SUV (3 Corridas)</label>
                    <input type="number" name="priceSuv3" defaultValue={editingService?.priceSuv3 || ""} placeholder="Ej. 25000" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all text-center" />
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-lg text-sm font-bold border flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {message.type === 'success' ? '✓' : '⚠'} {message.text}
                  </div>
                )}

                <div className="flex justify-end pt-4 gap-4">
                  <button type="button" onClick={handleCancelForm} className="text-gray-400 font-bold uppercase tracking-widest text-sm px-6 py-4 hover:text-white transition-colors">
                    Cancelar
                  </button>
                  <button disabled={saving} type="submit" className="bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm px-10 py-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                    {saving ? "Guardando..." : (editingService ? "Actualizar Servicio" : "Crear Servicio")}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GRILLA DE SERVICIOS (TARJETAS) */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">Tu catálogo está vacío</h3>
          <p className="text-gray-400 text-sm">Comienza agregando tu primer servicio de estética automotriz.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc) => (
            <div key={svc.id} className="bg-brand-surface/80 border border-white/10 rounded-2xl p-6 hover:border-brand-cyan/50 transition-colors group flex flex-col h-full">
              
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border ${getCategoryColor(svc.category)}`}>
                  {svc.category}
                </span>
                <span className="text-gray-400 text-xs font-bold bg-black/50 px-2 py-1 rounded flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {svc.duration} Min
                </span>
              </div>

              <h4 className="text-xl font-bold text-white uppercase tracking-wider mb-2">{svc.name}</h4>
              <p className="text-gray-500 text-sm mb-6 line-clamp-2 min-h-[40px]">{svc.description || "Sin descripción detallada."}</p>

              <div className="mt-auto pt-4 border-t border-white/10 grid grid-cols-3 gap-2 mb-6">
                <div className="text-center bg-black/30 rounded p-2">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Auto</div>
                  <div className="text-white font-bold text-sm">${svc.priceAuto || 0}</div>
                </div>
                <div className="text-center bg-black/30 rounded p-2">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">SUV 2</div>
                  <div className="text-white font-bold text-sm">${svc.priceSuv2 || 0}</div>
                </div>
                <div className="text-center bg-black/30 rounded p-2">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">SUV 3</div>
                  <div className="text-white font-bold text-sm">${svc.priceSuv3 || 0}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto">
                <button 
                  onClick={() => handleEdit(svc)} 
                  className="w-full text-brand-cyan hover:text-white hover:bg-brand-cyan/20 text-[10px] uppercase font-bold tracking-widest border border-brand-cyan/20 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(svc.id)} 
                  className="w-full text-red-400 hover:text-white hover:bg-red-500/20 text-[10px] uppercase font-bold tracking-widest border border-red-500/20 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

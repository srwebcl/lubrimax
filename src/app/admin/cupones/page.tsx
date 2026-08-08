"use client";

import React, { useState, useEffect } from "react";
import { getCoupons, createCoupon, toggleCouponStatus, deleteCoupon } from "@/actions/admin-coupons";
import { motion, AnimatePresence } from "framer-motion";

type Coupon = {
  id: string;
  code: string;
  discountPct: number;
  isActive: boolean;
  validUntil: Date | null;
  usageLimit: number | null;
  usedCount: number;
};

export default function CuponesPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCoupons = async () => {
    setLoading(true);
    const data = await getCoupons();
    setCoupons(data as Coupon[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    const res = await createCoupon(formData);
    if (res.success) {
      setMessage({ type: "success", text: "Cupón creado exitosamente." });
      fetchCoupons();
      setTimeout(() => {
        setShowForm(false);
        setMessage(null);
      }, 2000);
    } else {
      setMessage({ type: "error", text: res.error || "Error al crear cupón" });
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    await toggleCouponStatus(id, currentStatus);
    fetchCoupons();
  };

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este cupón permanentemente?")) {
      await deleteCoupon(id);
      fetchCoupons();
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-12">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-white uppercase tracking-widest italic">Motor de <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan to-green-400">Cupones</span></h2>
          <p className="text-gray-400 text-sm mt-2">Genera códigos de descuento para tus campañas de marketing.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="w-full md:w-auto bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-white transition-colors shadow-[0_0_20px_rgba(56,189,248,0.2)]">
          {showForm ? "✕ Cancelar" : "✚ Nuevo Cupón"}
        </button>
      </div>

      {/* FORMULARIO */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-gradient-to-b from-brand-surface to-brand-pure border border-brand-cyan/30 rounded-2xl p-6 sm:p-8 relative shadow-[0_0_30px_rgba(56,189,248,0.1)] mb-8">
              <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6">Crear Código de Descuento</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Código Promocional</label>
                    <input type="text" name="code" required placeholder="Ej: CYBER26" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white uppercase focus:outline-none focus:border-brand-cyan" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Descuento (%)</label>
                    <input type="number" name="discountPct" required min="1" max="100" placeholder="Ej: 15" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Límite de Usos (Opcional)</label>
                    <input type="number" name="usageLimit" min="1" placeholder="Ej: 100 (vacío para ilimitado)" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan" />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Válido Hasta (Opcional)</label>
                    <input type="date" name="validUntil" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan" />
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-red-500/20 text-red-400'}`}>
                    {message.text}
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button disabled={saving} type="submit" className="bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm px-10 py-4 rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                    {saving ? "Guardando..." : "Crear Cupón"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LISTADO DE CUPONES */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-brand-cyan border-t-transparent rounded-full animate-spin"></div></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 border-dashed">
          <p className="text-gray-400 text-sm">Aún no has creado ningún cupón de descuento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <div key={coupon.id} className={`bg-brand-surface border ${coupon.isActive ? 'border-brand-cyan/30' : 'border-white/5 opacity-50'} rounded-2xl p-6 relative`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-2xl font-bold text-white tracking-widest uppercase">{coupon.code}</h4>
                  <p className="text-brand-cyan font-bold mt-1">{coupon.discountPct}% de descuento</p>
                </div>
                <button onClick={() => handleDelete(coupon.id)} className="text-red-400 hover:text-red-300">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>

              <div className="space-y-2 text-xs text-gray-400 uppercase tracking-widest">
                <div className="flex justify-between">
                  <span>Usos:</span>
                  <span className="text-white font-bold">{coupon.usedCount} / {coupon.usageLimit || "∞"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vence:</span>
                  <span className="text-white font-bold">{coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString('es-CL') : "Nunca"}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className={`text-[10px] uppercase font-bold tracking-widest ${coupon.isActive ? 'text-green-400' : 'text-gray-500'}`}>
                  {coupon.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <button onClick={() => handleToggle(coupon.id, coupon.isActive)} className={`text-[10px] uppercase font-bold tracking-widest px-4 py-2 rounded-lg border ${coupon.isActive ? 'border-gray-500 text-gray-400 hover:bg-white/5' : 'border-brand-cyan text-brand-cyan hover:bg-brand-cyan/10'}`}>
                  {coupon.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

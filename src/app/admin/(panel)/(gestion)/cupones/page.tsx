"use client";

import React, { useState, useEffect } from "react";
import { getCoupons, createCoupon, toggleCouponStatus, deleteCoupon } from "@/actions/admin-coupons";
import { Screen, PageHead, AddBtn, Sheet, Field, INPUT, CARD, Msg, Spinner, Empty, PrimaryBtn } from "@/components/admin/kit";

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
      await fetchCoupons();
      setShowForm(false);
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
    if (confirm("¿Eliminar este cupón permanentemente?")) {
      await deleteCoupon(id);
      fetchCoupons();
    }
  };

  return (
    <Screen>
      <PageHead
        title="Cupones"
        subtitle="Códigos de descuento para tus campañas."
        action={<AddBtn label="Cupón" onClick={() => { setMessage(null); setShowForm(true); }} />}
      />

      {loading ? (
        <Spinner />
      ) : coupons.length === 0 ? (
        <Empty>Aún no hay cupones de descuento.</Empty>
      ) : (
        <ul className="space-y-3">
          {coupons.map((coupon) => (
            <li key={coupon.id} className={`${CARD} ${coupon.isActive ? "" : "opacity-55"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black text-white tracking-wide">{coupon.code}</div>
                  <div className="text-brand-cyan font-semibold text-sm">{coupon.discountPct}% de descuento</div>
                </div>
                <button onClick={() => handleDelete(coupon.id)} className="text-red-400/80 p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span>Usos: <span className="text-white font-semibold">{coupon.usedCount}/{coupon.usageLimit || "∞"}</span></span>
                <span>Vence: <span className="text-white font-semibold">{coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString("es-CL") : "nunca"}</span></span>
              </div>
              <div className="mt-3 pt-3 border-t border-white/8 flex items-center justify-between">
                <span className={`text-xs font-bold ${coupon.isActive ? "text-green-400" : "text-gray-500"}`}>
                  {coupon.isActive ? "Activo" : "Inactivo"}
                </span>
                <button
                  onClick={() => handleToggle(coupon.id, coupon.isActive)}
                  className={`text-xs font-bold px-4 py-2 rounded-lg border ${
                    coupon.isActive
                      ? "border-white/12 text-gray-300"
                      : "border-brand-cyan/40 text-brand-cyan"
                  }`}
                >
                  {coupon.isActive ? "Desactivar" : "Activar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={showForm} onClose={() => setShowForm(false)} title="Nuevo cupón">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Código promocional">
            <input type="text" name="code" required placeholder="CYBER26" className={`${INPUT} uppercase`} />
          </Field>
          <Field label="Descuento (%)">
            <input type="number" name="discountPct" required min="1" max="100" placeholder="15" className={INPUT} />
          </Field>
          <Field label="Límite de usos" hint="Vacío = ilimitado">
            <input type="number" name="usageLimit" min="1" placeholder="100" className={INPUT} />
          </Field>
          <Field label="Válido hasta" hint="Opcional">
            <input type="date" name="validUntil" className={INPUT} />
          </Field>
          {message && <Msg kind="err">{message.text}</Msg>}
          <PrimaryBtn type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando…" : "Crear cupón"}
          </PrimaryBtn>
        </form>
      </Sheet>
    </Screen>
  );
}

"use client";

import React, { useState, useEffect } from "react";

export type Variant = {
  name: string;
  duration: number;
  priceAuto: number;
  priceSuv2: number;
  priceSuv3: number;
};

interface VariantsEditorProps {
  initialVariants?: Variant[] | null;
  onChange?: (variants: Variant[]) => void;
}

export default function VariantsEditor(props: VariantsEditorProps) {
  const { initialVariants } = props;
  const [variants, setVariants] = useState<Variant[]>(initialVariants || []);

  useEffect(() => {
    setVariants(initialVariants || []);
  }, [initialVariants]);

  // Pass changes to parent
  useEffect(() => {
    if (props.onChange) {
      props.onChange(variants);
    }
  }, [variants, props]);

  const addVariant = () => {
    setVariants([...variants, { name: "", duration: 60, priceAuto: 0, priceSuv2: 0, priceSuv3: 0 }]);
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-white/10 p-4 rounded-lg bg-black/20 mt-6">
      <div className="flex justify-between items-center mb-4">
        <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold">Variantes / Opciones (Ej. Grabado de Patentes)</label>
        <button type="button" onClick={addVariant} className="text-[10px] bg-brand-cyan/20 text-brand-cyan px-3 py-1 rounded hover:bg-brand-cyan/40 transition-colors uppercase font-bold tracking-widest">
          + Añadir Variante
        </button>
      </div>

      <input type="hidden" name="variants" value={variants.length > 0 ? JSON.stringify(variants) : ""} />

      {variants.length === 0 ? (
        <p className="text-gray-500 text-xs">Sin variantes. Este será un servicio estándar.</p>
      ) : (
        <div className="space-y-4">
          {variants.map((v, idx) => (
            <div key={idx} className="bg-black/40 border border-white/5 p-4 rounded-lg relative">
              <button type="button" onClick={() => removeVariant(idx)} className="absolute top-2 right-2 text-red-500 hover:text-red-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Nombre Variante</label>
                  <input type="text" value={v.name} onChange={(e) => updateVariant(idx, 'name', e.target.value)} placeholder="Ej. Solo Patente" className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Duración Total</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input type="number" min="0" value={Math.floor(v.duration / 60)} onChange={(e) => updateVariant(idx, 'duration', (parseInt(e.target.value) || 0) * 60 + (v.duration % 60))} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm text-center" />
                      <span className="block text-gray-500 text-[10px] text-center mt-1">Horas</span>
                    </div>
                    <div className="flex-1">
                      <input type="number" min="0" max="59" value={v.duration % 60} onChange={(e) => updateVariant(idx, 'duration', Math.floor(v.duration / 60) * 60 + (parseInt(e.target.value) || 0))} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm text-center" />
                      <span className="block text-gray-500 text-[10px] text-center mt-1">Minutos</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Precio Auto</label>
                  <input type="number" value={v.priceAuto} onChange={(e) => updateVariant(idx, 'priceAuto', parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Precio SUV Medianos</label>
                  <input type="number" value={v.priceSuv2} onChange={(e) => updateVariant(idx, 'priceSuv2', parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-gray-500 text-[10px] uppercase mb-1">Precio SUV Grandes</label>
                  <input type="number" value={v.priceSuv3} onChange={(e) => updateVariant(idx, 'priceSuv3', parseInt(e.target.value) || 0)} className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

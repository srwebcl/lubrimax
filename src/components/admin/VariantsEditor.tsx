"use client";

import { useState, useEffect } from "react";

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

const inp =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white focus:border-brand-cyan focus:outline-none";
const lbl = "block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1";

export default function VariantsEditor(props: VariantsEditorProps) {
  const { initialVariants } = props;
  const [variants, setVariants] = useState<Variant[]>(initialVariants || []);

  useEffect(() => {
    setVariants(initialVariants || []);
  }, [initialVariants]);

  useEffect(() => {
    props.onChange?.(variants);
  }, [variants, props]);

  const addVariant = () =>
    setVariants([...variants, { name: "", duration: 60, priceAuto: 0, priceSuv2: 0, priceSuv3: 0 }]);

  const updateVariant = (index: number, field: keyof Variant, value: string | number) => {
    const next = [...variants];
    next[index] = { ...next[index], [field]: value };
    setVariants(next);
  };

  const removeVariant = (index: number) => setVariants(variants.filter((_, i) => i !== index));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
          Variantes / opciones
        </span>
        <button type="button" onClick={addVariant} className="text-brand-cyan text-xs font-bold">
          + Añadir
        </button>
      </div>

      <input type="hidden" name="variants" value={variants.length > 0 ? JSON.stringify(variants) : ""} />

      {variants.length === 0 ? (
        <p className="text-[11px] text-gray-600">Sin variantes: servicio estándar.</p>
      ) : (
        <div className="space-y-3">
          {variants.map((v, idx) => (
            <div key={idx} className="rounded-xl border border-white/8 bg-black/30 p-3 relative">
              <button
                type="button"
                onClick={() => removeVariant(idx)}
                className="absolute top-2 right-2 text-red-400 text-lg leading-none"
              >
                ×
              </button>
              <div className="mb-2 pr-6">
                <label className={lbl}>Nombre de la variante</label>
                <input
                  type="text"
                  value={v.name}
                  onChange={(e) => updateVariant(idx, "name", e.target.value)}
                  placeholder="Ej. Solo patente"
                  className={inp}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className={lbl}>Horas</label>
                  <input
                    type="number"
                    min="0"
                    value={Math.floor(v.duration / 60)}
                    onChange={(e) =>
                      updateVariant(idx, "duration", (parseInt(e.target.value) || 0) * 60 + (v.duration % 60))
                    }
                    className={inp}
                  />
                </div>
                <div>
                  <label className={lbl}>Minutos</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={v.duration % 60}
                    onChange={(e) =>
                      updateVariant(idx, "duration", Math.floor(v.duration / 60) * 60 + (parseInt(e.target.value) || 0))
                    }
                    className={inp}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={lbl}>Auto</label>
                  <input type="number" value={v.priceAuto} onChange={(e) => updateVariant(idx, "priceAuto", parseInt(e.target.value) || 0)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>SUV med.</label>
                  <input type="number" value={v.priceSuv2} onChange={(e) => updateVariant(idx, "priceSuv2", parseInt(e.target.value) || 0)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>SUV gr.</label>
                  <input type="number" value={v.priceSuv3} onChange={(e) => updateVariant(idx, "priceSuv3", parseInt(e.target.value) || 0)} className={inp} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

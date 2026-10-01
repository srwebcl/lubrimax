"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateClient } from "@/actions/admin-clients";
import { Field, INPUT, PrimaryBtn, Msg } from "@/components/admin/kit";
import { formatPlate, normalizePlate } from "@/lib/plate";
import { NameInput, PhoneInput, RutInput } from "@/components/admin/ContactInputs";

export default function ClientProfileForm({ initialData }: { initialData: any }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [vehicles, setVehicles] = useState<{ plate: string; make: string; model: string }[]>(initialData.vehicles.map((v: any) => ({ ...v })));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      rut: formData.get("rut") as string,
      vehicles: vehicles.filter(v => v.plate.trim().length >= 4)
    };

    const result = await updateClient(initialData.id, data);
    
    if (result.success) {
      setMessage({ type: "success", text: "Datos guardados correctamente." });
      // Un cliente web recién consolidado pasa a tener su propia ficha.
      if (result.clientId !== initialData.id) {
        router.replace(`/admin/clientes/${result.clientId}`);
      } else {
        router.refresh();
      }
    } else {
      setMessage({ type: "error", text: result.error || "Error al guardar el cliente." });
    }
    
    setSaving(false);
  };

  const addVehicle = () => {
    setVehicles([...vehicles, { plate: "", make: "", model: "" }]);
  };

  const removeVehicle = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  const updateVehicle = (index: number, field: "plate" | "make" | "model", value: string) => {
    const newVehicles = [...vehicles];
    if (field === "plate") {
      newVehicles[index][field] = normalizePlate(value);
    } else {
      newVehicles[index][field] = value;
    }
    setVehicles(newVehicles);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Nombre Completo">
        <NameInput name="name" required defaultValue={initialData.name} className={INPUT} />
      </Field>
      
      <Field label="RUT (Opcional)">
        <RutInput name="rut" defaultValue={initialData.rut} className={INPUT} />
      </Field>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Celular">
          <PhoneInput name="phone" defaultValue={initialData.phone} className={INPUT} />
        </Field>
        <Field label="Correo Electrónico">
          <input type="email" name="email" defaultValue={initialData.email || ""} className={INPUT} />
        </Field>
      </div>

      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Vehículos Asociados</label>
          <button 
            type="button" 
            onClick={addVehicle}
            className="text-xs font-bold text-brand-cyan hover:text-cyan-300 transition-colors"
          >
            + Agregar Vehículo
          </button>
        </div>
        
        {vehicles.length === 0 ? (
          <p className="text-xs text-gray-500 italic mb-4">El cliente no tiene vehículos asociados.</p>
        ) : (
          <div className="space-y-3 mb-4">
            {vehicles.map((v, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-black/20 p-3 rounded-xl border border-white/5 relative">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                  <input 
                    placeholder="Patente" 
                    value={formatPlate(v.plate)}
                    onChange={e => updateVehicle(i, "plate", e.target.value)}
                    className={`${INPUT} py-2 text-sm font-mono uppercase bg-[#0D1117]`} 
                    required
                  />
                  <input 
                    placeholder="Marca" 
                    value={v.make}
                    onChange={e => updateVehicle(i, "make", e.target.value)}
                    className={`${INPUT} py-2 text-sm bg-[#0D1117]`} 
                    required
                  />
                  <input 
                    placeholder="Modelo" 
                    value={v.model}
                    onChange={e => updateVehicle(i, "model", e.target.value)}
                    className={`${INPUT} py-2 text-sm bg-[#0D1117]`} 
                    required
                  />
                </div>
                <button 
                  type="button"
                  onClick={() => removeVehicle(i)}
                  className="w-full sm:w-10 h-10 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center shrink-0 transition-colors"
                  title="Eliminar vehículo"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {message && <Msg kind={message.type === "success" ? "ok" : "err"}>{message.text}</Msg>}
      
      <PrimaryBtn type="submit" disabled={saving} className="w-full mt-2">
        {saving ? "Guardando cambios..." : (initialData.id.startsWith("web-") ? "Guardar y Consolidar" : "Guardar Cambios")}
      </PrimaryBtn>
    </form>
  );
}

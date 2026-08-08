"use client";

import React, { useState, useEffect } from "react";
import { getMemberships, createMembership, updateMembership, deleteMembership, getPartners, createPartner, updatePartner, deletePartner } from "@/actions/admin-club";
import { motion, AnimatePresence } from "framer-motion";

type Membership = {
  id: string;
  name: string;
  price: number;
  discountPercent: number;
  features: string[];
  isActive: boolean;
};

type Partner = {
  id: string;
  name: string;
  description: string | null;
  benefits: string[];
  logo: string | null;
  isActive: boolean;
};

export default function ClubAdminPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Membership Form State
  const [showMemForm, setShowMemForm] = useState(false);
  const [editingMem, setEditingMem] = useState<Membership | null>(null);
  
  // Partner Form State
  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Partner | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const m = await getMemberships();
    const p = await getPartners();
    setMemberships(m);
    setPartners(p);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMemSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    let res;
    if (editingMem) {
      res = await updateMembership(editingMem.id, formData);
    } else {
      res = await createMembership(formData);
    }
    
    if (res.success) {
      setShowMemForm(false);
      setEditingMem(null);
      fetchData();
    } else {
      alert(res.error);
    }
  };

  const handlePartSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadingLogo(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Check if there is a file selected
    const fileInput = form.querySelector('input[name="logoFile"]') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const uploadData = new FormData();
      uploadData.append('file', fileInput.files[0]);
      
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });
        const upJson = await upRes.json();
        if (upJson.publicUrl) {
          formData.set('logo', upJson.publicUrl);
        } else {
          alert("Error al subir logo: " + (upJson.error || "Desconocido"));
          setUploadingLogo(false);
          return;
        }
      } catch (err) {
        alert("Error de red al subir logo");
        setUploadingLogo(false);
        return;
      }
    } else if (editingPart && editingPart.logo) {
      // Mantener logo existente si no se sube uno nuevo
      formData.set('logo', editingPart.logo);
    }

    let res;
    if (editingPart) {
      res = await updatePartner(editingPart.id, formData);
    } else {
      res = await createPartner(formData);
    }
    
    if (res.success) {
      setShowPartForm(false);
      setEditingPart(null);
      fetchData();
    } else {
      alert(res.error);
    }
    setUploadingLogo(false);
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-12">
      {/* HEADER */}
      <div className="border-b border-white/10 pb-6">
        <h2 className="text-xl md:text-3xl font-bold text-white uppercase tracking-widest italic">Club <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">LUBRIMAX</span></h2>
        <p className="text-gray-400 text-sm mt-2">Configura los niveles de fidelización y los comercios asociados.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* SECTION: MEMBERSHIPS */}
          <section>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-xl font-bold text-white uppercase tracking-widest">Niveles de Membresía</h3>
              <button onClick={() => { setShowMemForm(!showMemForm); setEditingMem(null); }} className="w-full sm:w-auto bg-amber-500 text-black font-bold text-xs px-4 py-2 rounded hover:bg-white transition-colors">
                {showMemForm ? "Cancelar" : "➕ Nuevo Nivel"}
              </button>
            </div>

            <AnimatePresence>
              {showMemForm && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleMemSubmit} 
                  className="bg-brand-surface/50 border border-amber-500/30 rounded-xl p-6 mb-8 space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Nombre (Ej: Titanium)</label>
                      <input type="text" name="name" required defaultValue={editingMem?.name} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Precio Mensual ($)</label>
                      <input type="number" name="price" required defaultValue={editingMem?.price} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Descuento en Servicios (%)</label>
                      <input type="number" name="discountPercent" required defaultValue={editingMem?.discountPercent} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Beneficios Adicionales (Uno por línea)</label>
                    <textarea name="features" rows={3} defaultValue={editingMem?.features.join('\n')} placeholder="Lavado Express Gratis..." className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm"></textarea>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="bg-amber-500 text-black px-6 py-2 rounded font-bold text-sm">Guardar Nivel</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {memberships.filter(m => m.isActive).map(m => (
                <div key={m.id} className="bg-gradient-to-b from-black to-brand-surface border border-white/10 p-6 rounded-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10">★</div>
                  <h4 className="text-xl font-bold text-amber-500 uppercase tracking-widest">{m.name}</h4>
                  <div className="text-2xl text-white font-bold my-2">${m.price} <span className="text-sm text-gray-500 font-normal">/mes</span></div>
                  <div className="inline-block bg-green-500/20 text-green-400 border border-green-500/30 rounded px-2 py-1 text-xs font-bold mb-4">
                    {m.discountPercent}% OFF Clínico
                  </div>
                  <ul className="text-sm text-gray-400 space-y-2 mb-6">
                    {m.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                  </ul>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingMem(m); setShowMemForm(true); }} className="flex-1 border border-white/20 text-white py-1 rounded text-xs hover:bg-white/10">Editar</button>
                    <button onClick={() => deleteMembership(m.id)} className="flex-1 border border-red-500/30 text-red-400 py-1 rounded text-xs hover:bg-red-500/10">Bajar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION: PARTNERS */}
          <section className="pt-8 border-t border-white/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-xl font-bold text-white uppercase tracking-widest">Comercios Asociados</h3>
              <button onClick={() => { setShowPartForm(!showPartForm); setEditingPart(null); }} className="w-full sm:w-auto border border-brand-cyan text-brand-cyan font-bold text-xs px-4 py-2 rounded hover:bg-brand-cyan/10 transition-colors">
                {showPartForm ? "Cancelar" : "➕ Nuevo Socio"}
              </button>
            </div>

            <AnimatePresence>
              {showPartForm && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={handlePartSubmit} 
                  className="bg-brand-surface/50 border border-brand-cyan/30 rounded-xl p-6 mb-8 space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Nombre Empresa</label>
                      <input type="text" name="name" required defaultValue={editingPart?.name} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Rubro / Descripción Corta</label>
                      <input type="text" name="description" defaultValue={editingPart?.description || ""} className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Beneficios para Socios del Club (Uno por línea)</label>
                    <textarea name="benefits" rows={2} required defaultValue={editingPart?.benefits.join('\n')} placeholder="20% Dcto en Neumáticos Michelin..." className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm"></textarea>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Subir Logo (Opcional)</label>
                    <input type="file" accept="image/*" name="logoFile" className="w-full bg-black/50 border border-white/10 rounded p-2 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-brand-cyan file:text-black hover:file:bg-brand-blue" />
                    {editingPart?.logo && (
                      <p className="text-[10px] text-gray-500 mt-2">Ya existe un logo. Sube uno nuevo para reemplazarlo.</p>
                    )}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button type="submit" disabled={uploadingLogo} className="bg-brand-cyan text-black px-6 py-2 rounded font-bold text-sm disabled:opacity-50">
                      {uploadingLogo ? "Guardando..." : "Guardar Socio"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {partners.filter(p => p.isActive).map(p => (
                <div key={p.id} className="bg-brand-surface/80 border border-white/10 p-5 rounded-xl flex flex-col h-full">
                  {p.logo && (
                    <div className="w-full h-24 mb-4 bg-white rounded-lg flex items-center justify-center p-2">
                      <img src={p.logo} alt={p.name} className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  <h4 className="text-lg font-bold text-white mt-auto">{p.name}</h4>
                  <p className="text-gray-500 text-xs mb-3">{p.description}</p>
                  <ul className="text-xs text-brand-cyan font-bold space-y-1 mb-4 flex-1">
                    {p.benefits.map((b, i) => <li key={i}>🎁 {b}</li>)}
                  </ul>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => { setEditingPart(p); setShowPartForm(true); }} className="flex-1 border border-white/20 text-white py-1 rounded text-[10px] hover:bg-white/10">Editar</button>
                    <button onClick={() => deletePartner(p.id)} className="flex-1 border border-red-500/30 text-red-400 py-1 rounded text-[10px] hover:bg-red-500/10">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

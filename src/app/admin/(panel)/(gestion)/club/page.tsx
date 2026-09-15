"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  getMemberships, createMembership, updateMembership, deleteMembership,
  getPartners, createPartner, updatePartner, deletePartner,
} from "@/actions/admin-club";
import { uploadFileToR2 } from "@/lib/uploadClient";
import { Screen, PageHead, AddBtn, Sheet, Field, INPUT, CARD, Spinner, Empty, PrimaryBtn } from "@/components/admin/kit";

type Membership = { id: string; name: string; price: number; discountPercent: number; features: string[]; isActive: boolean };
type Partner = { id: string; name: string; description: string | null; benefits: string[]; logo: string | null; isActive: boolean };

export default function ClubAdminPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const [showMemForm, setShowMemForm] = useState(false);
  const [editingMem, setEditingMem] = useState<Membership | null>(null);

  const [showPartForm, setShowPartForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Partner | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setMemberships(await getMemberships());
    setPartners(await getPartners());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleMemSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = editingMem
      ? await updateMembership(editingMem.id, formData)
      : await createMembership(formData);
    if (res.success) {
      setShowMemForm(false);
      setEditingMem(null);
      fetchData();
    } else alert(res.error);
  };

  const handlePartSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadingLogo(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.querySelector('input[name="logoFile"]') as HTMLInputElement;
    if (fileInput?.files?.length) {
      try {
        const logoUrl = await uploadFileToR2(fileInput.files[0]);
        formData.set("logo", logoUrl);
      } catch (err) {
        alert("Error al subir logo: " + (err as Error).message);
        setUploadingLogo(false);
        return;
      }
    } else if (editingPart?.logo) {
      formData.set("logo", editingPart.logo);
    }
    const res = editingPart
      ? await updatePartner(editingPart.id, formData)
      : await createPartner(formData);
    if (res.success) {
      setShowPartForm(false);
      setEditingPart(null);
      fetchData();
    } else alert(res.error);
    setUploadingLogo(false);
  };

  return (
    <Screen>
      <PageHead title="Club Lubrimax" subtitle="Niveles de membresía y comercios asociados." />

      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Membresías */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Niveles de membresía</h2>
              <AddBtn label="Nivel" onClick={() => { setEditingMem(null); setShowMemForm(true); }} />
            </div>
            {memberships.filter((m) => m.isActive).length === 0 ? (
              <Empty>Sin niveles configurados.</Empty>
            ) : (
              <ul className="space-y-3">
                {memberships.filter((m) => m.isActive).map((m) => (
                  <li key={m.id} className={CARD}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-bold text-amber-400">{m.name}</div>
                        <div className="text-white font-bold">${m.price}<span className="text-xs text-gray-500 font-normal">/mes</span></div>
                      </div>
                      <span className="text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/25 rounded-full px-2 py-1">
                        {m.discountPercent}% OFF
                      </span>
                    </div>
                    {m.features.length > 0 && (
                      <ul className="mt-2 text-sm text-gray-400 space-y-0.5">
                        {m.features.map((f, i) => <li key={i}>✓ {f}</li>)}
                      </ul>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => { setEditingMem(m); setShowMemForm(true); }} className="flex-1 text-xs font-bold py-2 rounded-lg border border-white/12 text-white">Editar</button>
                      <button onClick={() => deleteMembership(m.id).then(fetchData)} className="flex-1 text-xs font-bold py-2 rounded-lg border border-red-500/25 text-red-400">Dar de baja</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Comercios asociados */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Comercios asociados</h2>
              <AddBtn label="Socio" onClick={() => { setEditingPart(null); setShowPartForm(true); }} />
            </div>
            {partners.filter((p) => p.isActive).length === 0 ? (
              <Empty>Sin comercios asociados.</Empty>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {partners.filter((p) => p.isActive).map((p) => (
                  <li key={p.id} className={CARD}>
                    {p.logo && (
                      <div className="relative w-full h-20 mb-3 bg-white rounded-lg">
                        <Image src={p.logo} alt={p.name} fill sizes="200px" className="object-contain p-2" />
                      </div>
                    )}
                    <div className="font-bold text-white">{p.name}</div>
                    <p className="text-xs text-gray-500">{p.description}</p>
                    {p.benefits.length > 0 && (
                      <ul className="mt-2 text-xs text-brand-cyan font-semibold space-y-0.5">
                        {p.benefits.map((b, i) => <li key={i}>🎁 {b}</li>)}
                      </ul>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => { setEditingPart(p); setShowPartForm(true); }} className="flex-1 text-xs font-bold py-2 rounded-lg border border-white/12 text-white">Editar</button>
                      <button onClick={() => deletePartner(p.id).then(fetchData)} className="flex-1 text-xs font-bold py-2 rounded-lg border border-red-500/25 text-red-400">Eliminar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {/* Sheet: membresía */}
      <Sheet open={showMemForm} onClose={() => { setShowMemForm(false); setEditingMem(null); }} title={editingMem ? `Editar: ${editingMem.name}` : "Nuevo nivel"}>
        <form key={editingMem?.id ?? "new-mem"} onSubmit={handleMemSubmit} className="space-y-4">
          <Field label="Nombre"><input type="text" name="name" required defaultValue={editingMem?.name} placeholder="Titanium" className={INPUT} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio mensual ($)"><input type="number" name="price" required defaultValue={editingMem?.price} className={INPUT} /></Field>
            <Field label="Descuento (%)"><input type="number" name="discountPercent" required defaultValue={editingMem?.discountPercent} className={INPUT} /></Field>
          </div>
          <Field label="Beneficios" hint="Uno por línea">
            <textarea name="features" rows={3} defaultValue={editingMem?.features.join("\n")} placeholder="Lavado express gratis…" className={INPUT} />
          </Field>
          <PrimaryBtn type="submit" className="w-full">Guardar nivel</PrimaryBtn>
        </form>
      </Sheet>

      {/* Sheet: socio */}
      <Sheet open={showPartForm} onClose={() => { setShowPartForm(false); setEditingPart(null); }} title={editingPart ? `Editar: ${editingPart.name}` : "Nuevo socio"}>
        <form key={editingPart?.id ?? "new-part"} onSubmit={handlePartSubmit} className="space-y-4">
          <Field label="Nombre de la empresa"><input type="text" name="name" required defaultValue={editingPart?.name} className={INPUT} /></Field>
          <Field label="Rubro / descripción corta"><input type="text" name="description" defaultValue={editingPart?.description || ""} className={INPUT} /></Field>
          <Field label="Beneficios para socios" hint="Uno por línea">
            <textarea name="benefits" rows={2} required defaultValue={editingPart?.benefits.join("\n")} placeholder="20% dcto en neumáticos…" className={INPUT} />
          </Field>
          <Field label="Logo" hint={editingPart?.logo ? "Ya hay un logo. Sube otro para reemplazar." : "Opcional"}>
            <input type="file" accept="image/*" name="logoFile" className="w-full text-xs text-white file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-brand-cyan file:text-black" />
          </Field>
          <PrimaryBtn type="submit" disabled={uploadingLogo} className="w-full">
            {uploadingLogo ? "Guardando…" : "Guardar socio"}
          </PrimaryBtn>
        </form>
      </Sheet>
    </Screen>
  );
}

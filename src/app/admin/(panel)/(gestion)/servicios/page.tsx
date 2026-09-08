"use client";

import React, { useState, useEffect } from "react";
import { createService, deleteService, updateService, getAdminServices } from "@/actions/admin-services";
import { getAdminCategories } from "@/actions/admin-categories";
import VariantsEditor from "@/components/admin/VariantsEditor";
import { ServiceCategory } from "@prisma/client";
import { Screen, PageHead, AddBtn, Sheet, Field, INPUT, CARD, Msg, Spinner, Empty, PrimaryBtn } from "@/components/admin/kit";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
  category: string;
  categoryId: string | null;
  image: string | null;
  images?: string[];
  badges: string[];
  variants: any;
  serviceCategory?: ServiceCategory | null;
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [dbCategories, setDbCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [currentVariants, setCurrentVariants] = useState<any[]>([]);

  const fetchServices = async () => {
    setLoading(true);
    const [data, cats] = await Promise.all([getAdminServices(), getAdminCategories()]);
    setServices(data as Service[]);
    setDbCategories(cats);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const uploadFileToR2 = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Fallo al subir archivo");
    return data.publicUrl;
  };

  const handleManualSubmit = async () => {
    setSaving(true);
    setMessage(null);
    const form = document.getElementById("service-form") as HTMLFormElement | null;
    if (!form) { setSaving(false); return; }
    if (!form.checkValidity()) { form.reportValidity(); setSaving(false); return; }

    const formData = new FormData(form);
    const durationHours = parseInt(formData.get("durationHours") as string) || 0;
    const durationMins = parseInt(formData.get("durationMins") as string) || 0;
    formData.set("duration", (durationHours * 60 + durationMins).toString());
    formData.delete("durationHours");
    formData.delete("durationMins");
    formData.set("images", JSON.stringify(existingImages));

    try {
      const result = editingService
        ? await updateService(editingService.id, formData)
        : await createService(formData);
      if (result.success) {
        await fetchServices();
        closeForm();
      } else {
        setMessage({ type: "error", text: result.error || "Error al procesar la solicitud." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error: " + (err as Error).message });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este servicio? Falla si tiene reservas asociadas.")) return;
    const result = await deleteService(id);
    if (result.success) fetchServices();
    else alert(result.error);
  };

  const openNew = () => {
    setEditingService(null);
    setExistingImages([]);
    setCurrentVariants([]);
    setMessage(null);
    setShowForm(true);
  };
  const openEdit = (svc: Service) => {
    setEditingService(svc);
    setExistingImages(svc.images?.length ? svc.images : svc.image ? [svc.image] : []);
    setCurrentVariants(svc.variants || []);
    setMessage(null);
    setShowForm(true);
  };
  const closeForm = () => {
    setShowForm(false);
    setEditingService(null);
    setExistingImages([]);
    setCurrentVariants([]);
    setMessage(null);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploadingImages(true);
    setMessage(null);
    try {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) urls.push(await uploadFileToR2(e.target.files[i]));
      setExistingImages((prev) => [...prev, ...urls]);
      e.target.value = "";
    } catch (err) {
      setMessage({ type: "error", text: "Error al subir imágenes: " + (err as Error).message });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const categories = Array.from(new Set(services.map((s) => s.category)));
  const filtered = activeFilter ? services.filter((s) => s.category === activeFilter) : services;

  return (
    <Screen size="lg">
      <PageHead
        title="Catálogo"
        subtitle="Servicios, precios y duraciones."
        action={<AddBtn label="Servicio" onClick={openNew} />}
      />

      {!loading && categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4">
          <button onClick={() => setActiveFilter(null)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${activeFilter === null ? "bg-white text-brand-pure" : "bg-white/5 text-gray-400"}`}>Todos</button>
          {categories.map((cat) => (
            <button key={cat} onClick={() => setActiveFilter(cat)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${activeFilter === cat ? "bg-brand-cyan text-brand-pure" : "bg-white/5 text-gray-400"}`}>{cat}</button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty>{services.length === 0 ? "Agrega tu primer servicio." : "Nada en esta categoría."}</Empty>
      ) : (
        <ul className="space-y-3">
          {filtered.map((svc) => (
            <li key={svc.id} className={CARD}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] text-brand-cyan font-bold uppercase tracking-wider">{svc.category}</div>
                  <div className="font-bold text-white">{svc.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {svc.duration >= 60 ? `${Math.floor(svc.duration / 60)}h ${svc.duration % 60 || ""}` : `${svc.duration} min`}
                    {svc.variants?.length > 0 && ` · ${svc.variants.length} opciones`}
                  </div>
                </div>
                <div className="text-right text-sm shrink-0">
                  <div className="text-white font-bold">${(svc.priceAuto || 0).toLocaleString("es-CL")}</div>
                  <div className="text-[11px] text-gray-500">auto</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => openEdit(svc)} className="flex-1 text-xs font-bold py-2 rounded-lg border border-brand-cyan/25 text-brand-cyan">Editar</button>
                <button onClick={() => handleDelete(svc.id)} className="flex-1 text-xs font-bold py-2 rounded-lg border border-red-500/25 text-red-400">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={showForm} onClose={closeForm} title={editingService ? `Editar: ${editingService.name}` : "Nuevo servicio"}>
        <form id="service-form" className="space-y-4">
          <Field label="Nombre del servicio">
            <input type="text" name="name" required defaultValue={editingService?.name || ""} placeholder="Sellado cerámico 9H" className={INPUT} />
          </Field>
          <Field label="Categoría">
            <select
              name="categoryId"
              required
              defaultValue={editingService?.categoryId || ""}
              onChange={(e) => {
                const text = e.target.options[e.target.selectedIndex].text;
                const hidden = document.getElementById("hiddenCategoryText") as HTMLInputElement | null;
                if (hidden) hidden.value = text;
              }}
              className={INPUT}
            >
              <option value="" disabled>Seleccionar…</option>
              {dbCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="hidden" name="category" id="hiddenCategoryText" defaultValue={editingService?.category || "Detailing"} />
          </Field>
          <Field label="Descripción" hint="Opcional">
            <textarea name="description" rows={2} defaultValue={editingService?.description || ""} className={INPUT} />
          </Field>
          <Field label="Etiquetas" hint="Separadas por coma">
            <input type="text" name="badges" defaultValue={editingService?.badges?.join(", ") || ""} placeholder="Nanotecnología, 7 meses" className={INPUT} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración (horas)">
              <input type="number" name="durationHours" min="0" defaultValue={editingService ? Math.floor(editingService.duration / 60) : 1} className={INPUT} />
            </Field>
            <Field label="Minutos">
              <input type="number" name="durationMins" min="0" max="59" defaultValue={editingService ? editingService.duration % 60 : 0} className={INPUT} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Auto ($)">
              <input type="number" name="priceAuto" defaultValue={editingService?.priceAuto || ""} className={`${INPUT} px-2`} />
            </Field>
            <Field label="SUV med.">
              <input type="number" name="priceSuv2" defaultValue={editingService?.priceSuv2 || ""} className={`${INPUT} px-2`} />
            </Field>
            <Field label="SUV grande">
              <input type="number" name="priceSuv3" defaultValue={editingService?.priceSuv3 || ""} className={`${INPUT} px-2`} />
            </Field>
          </div>

          <VariantsEditor initialVariants={editingService?.variants} onChange={setCurrentVariants} />

          <Field label="Galería de imágenes">
            <label className={`${INPUT} flex items-center justify-center cursor-pointer text-sm ${isUploadingImages ? "text-brand-cyan" : "text-gray-400"}`}>
              {isUploadingImages ? "Subiendo…" : "+ Subir imágenes"}
              <input type="file" className="hidden" name="additionalImages" multiple accept="image/*" onChange={handleImageSelect} disabled={isUploadingImages} />
            </label>
            {existingImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {existingImages.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setExistingImages((p) => p.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 bg-black/70 text-white w-5 h-5 rounded-full text-xs">×</button>
                  </div>
                ))}
              </div>
            )}
          </Field>

          {message && <Msg kind={message.type === "success" ? "ok" : "err"}>{message.text}</Msg>}
          <PrimaryBtn type="button" onClick={handleManualSubmit} disabled={saving || isUploadingImages} className="w-full">
            {saving ? "Guardando…" : editingService ? "Guardar cambios" : "Crear servicio"}
          </PrimaryBtn>
        </form>
      </Sheet>
    </Screen>
  );
}

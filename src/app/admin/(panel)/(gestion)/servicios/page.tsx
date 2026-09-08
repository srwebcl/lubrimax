"use client";

import React, { useState, useEffect } from "react";
import { createService, deleteService, updateService, getAdminServices } from "@/actions/admin-services";
import { getAdminCategories } from "@/actions/admin-categories";
import { motion, AnimatePresence } from "framer-motion";
import VariantsEditor from "@/components/admin/VariantsEditor";
import { ServiceCategory } from "@prisma/client";

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
  const [currentStep, setCurrentStep] = useState(1);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [currentVariants, setCurrentVariants] = useState<any[]>([]);
  const formRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentStep === 3 && currentVariants.length > 0) {
      const form = document.getElementById("service-form") as HTMLFormElement;
      if (!form) return;
      
      const pAuto = form.elements.namedItem("priceAuto") as HTMLInputElement;
      const pSuv2 = form.elements.namedItem("priceSuv2") as HTMLInputElement;
      const pSuv3 = form.elements.namedItem("priceSuv3") as HTMLInputElement;
      const dHours = form.elements.namedItem("durationHours") as HTMLInputElement;
      const dMins = form.elements.namedItem("durationMins") as HTMLInputElement;

      const minAuto = Math.min(...currentVariants.map(v => v.priceAuto || 0));
      const minSuv2 = Math.min(...currentVariants.map(v => v.priceSuv2 || 0));
      const minSuv3 = Math.min(...currentVariants.map(v => v.priceSuv3 || 0));
      const minDuration = Math.min(...currentVariants.map(v => v.duration || 60));

      if (pAuto && (!pAuto.value || pAuto.value === "0")) pAuto.value = minAuto.toString();
      if (pSuv2 && (!pSuv2.value || pSuv2.value === "0")) pSuv2.value = minSuv2.toString();
      if (pSuv3 && (!pSuv3.value || pSuv3.value === "0")) pSuv3.value = minSuv3.toString();
      
      // Auto-completar duración si está en el valor por defecto de 1 hora
      if (dHours && dMins && dHours.value === "1" && dMins.value === "0") {
        dHours.value = Math.floor(minDuration / 60).toString();
        dMins.value = (minDuration % 60).toString();
      }
    }
  }, [currentStep, currentVariants]);

  const fetchServices = async () => {
    setLoading(true);
    const data = await getAdminServices();
    const cats = await getAdminCategories();
    setServices(data);
    setDbCategories(cats);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const uploadFileToR2 = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Fallo al subir archivo");
    
    return data.publicUrl;
  };

  const handleManualSubmit = async () => {
    setSaving(true);
    setMessage(null);
    
    const form = document.getElementById("service-form") as HTMLFormElement;
    if (!form) {
      setSaving(false);
      return;
    }
    
    if (!form.checkValidity()) {
      form.reportValidity();
      setSaving(false);
      return;
    }
    
    const formData = new FormData(form);
    
    // Process duration
    const durationHours = parseInt(formData.get("durationHours") as string) || 0;
    const durationMins = parseInt(formData.get("durationMins") as string) || 0;
    formData.set("duration", (durationHours * 60 + durationMins).toString());
    formData.delete("durationHours");
    formData.delete("durationMins");

    try {
      formData.set("images", JSON.stringify(existingImages));
      setMessage({ type: "success", text: "Guardando servicio..." });
    
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
          setExistingImages([]);
          setCurrentStep(1);
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ type: "error", text: result.error || "Error al procesar la solicitud." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Error: " + err.message });
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
    setExistingImages(svc.images && svc.images.length > 0 ? svc.images : (svc.image ? [svc.image] : []));
    setCurrentVariants(svc.variants || []);
    setCurrentStep(1);
    setShowForm(true);
    setMessage(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingService(null);
    setExistingImages([]);
    setCurrentVariants([]);
    setCurrentStep(1);
    setMessage(null);
  };

  const handleNewService = () => {
    setEditingService(null);
    setExistingImages([]);
    setCurrentVariants([]);
    setCurrentStep(1);
    setShowForm(true);
    setMessage(null);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingImages(true);
    setMessage({ type: "success", text: "Subiendo imágenes..." });
    try {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const url = await uploadFileToR2(e.target.files[i]);
        urls.push(url);
      }
      setExistingImages(prev => [...prev, ...urls]);
      setMessage({ type: "success", text: "Imágenes subidas correctamente." });
      e.target.value = ''; // clear input
    } catch (err: any) {
      setMessage({ type: "error", text: "Error al subir imágenes: " + err.message });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setExistingImages(prev => {
      const newImages = [...prev];
      if (direction === 'left' && index > 0) {
        [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
      } else if (direction === 'right' && index < newImages.length - 1) {
        [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
      }
      return newImages;
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Detailing": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "Lavados": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Servicios Especiales": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Extras": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Mecánica": return "bg-red-500/10 text-red-400 border-red-500/20";
      default: return "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20";
    }
  };

  const categories = Array.from(new Set(services.map(s => s.category)));
  const filteredServices = activeFilter ? services.filter(s => s.category === activeFilter) : services;

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="mb-8 border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-3xl font-bold text-white uppercase tracking-widest italic">Catálogo <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan">de Servicios</span></h2>
          <p className="text-gray-400 text-sm mt-2">Administra los tratamientos, precios y duraciones disponibles para tus clientes.</p>
        </div>
        <button 
          onClick={() => showForm ? handleCancelForm() : handleNewService()}
          className="w-full md:w-auto bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-white transition-colors shadow-[0_0_20px_rgba(56,189,248,0.2)] whitespace-nowrap"
        >
          {showForm ? "✕ Cancelar" : "➕ Nuevo Servicio"}
        </button>
      </div>

      {/* FILTROS FLOTANTES */}
      {!loading && services.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors border ${
              activeFilter === null 
                ? "bg-white text-brand-pure border-white" 
                : "bg-transparent text-gray-400 border-white/20 hover:border-white hover:text-white"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors border ${
                activeFilter === cat 
                  ? "bg-brand-cyan text-brand-pure border-brand-cyan" 
                  : "bg-transparent text-gray-400 border-white/20 hover:border-brand-cyan hover:text-brand-cyan"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* FORMULARIO MODAL */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={handleCancelForm}
            />
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="relative w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-4xl bg-[#0f1115] sm:border border-white/10 rounded-t-[32px] sm:rounded-b-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] sm:shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Grabber para Mobile */}
              <div className="w-full flex justify-center pt-3 pb-1 sm:hidden absolute top-0 z-10">
                <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
              </div>
              
              {/* Header Fijo */}
              <div className="p-6 pt-8 sm:pt-6 border-b border-white/10 flex justify-between items-center bg-[#0f1115] relative z-0 shrink-0">
                <h3 className="text-brand-cyan text-lg md:text-xl uppercase tracking-widest font-bold flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  {editingService ? `Editando: ${editingService.name}` : "Configurar Nuevo Tratamiento"}
                </h3>
                <button onClick={handleCancelForm} className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Tabs Header */}
              <div className="bg-[#0f1115] p-4 border-b border-white/5 flex gap-2 overflow-x-auto custom-scrollbar shrink-0">
                {[1, 2, 3, 4].map(step => (
                  <button key={step} type="button" onClick={() => setCurrentStep(step)} className={`shrink-0 px-5 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-full transition-all ${currentStep === step ? 'bg-brand-cyan text-black shadow-[0_0_15px_rgba(56,189,248,0.3)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}>
                    {step === 1 && "1. Básica"}
                    {step === 2 && "2. Variantes"}
                    {step === 3 && "3. Precios"}
                    {step === 4 && "4. Galería"}
                  </button>
                ))}
              </div>

              {/* Body Scrolleable */}
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-[#0f1115] to-black">
                <form id="service-form" className="space-y-6">
                  
                  {/* PASO 1: INFO BÁSICA */}
                  <div className={currentStep === 1 ? 'block space-y-6 animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Nombre del Servicio</label>
                        <input type="text" name="name" required defaultValue={editingService?.name || ""} placeholder="Ej. Sellado Cerámico 9H" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Categoría</label>
                        <div className="relative">
                          <select 
                            name="categoryId" 
                            defaultValue={editingService?.categoryId || ""} 
                            required
                            onChange={(e) => {
                              const select = e.target;
                              const text = select.options[select.selectedIndex].text;
                              const hiddenInput = document.getElementById('hiddenCategoryText') as HTMLInputElement;
                              if(hiddenInput) hiddenInput.value = text;
                            }}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"
                          >
                            <option value="">Selecciona una categoría</option>
                            {dbCategories.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <input type="hidden" name="category" id="hiddenCategoryText" defaultValue={editingService?.category || "Detailing"} />
                          <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Descripción (Opcional)</label>
                      <textarea name="description" rows={3} defaultValue={editingService?.description || ""} placeholder="Detalles de lo que incluye el servicio..." className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all"></textarea>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Badges / Etiquetas (Separadas por comas)</label>
                      <input type="text" name="badges" defaultValue={editingService?.badges ? editingService.badges.join(", ") : ""} placeholder="Ej. Nanotecnología, 7 Meses, Premium" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan transition-all" />
                      <p className="text-[10px] text-gray-500 mt-1">Aparecerán como pequeñas etiquetas resaltadas sobre el título del servicio.</p>
                    </div>
                  </div>

                  {/* PASO 2: OPCIONES (VARIANTES) */}
                  <div className={currentStep === 2 ? 'block animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                    <p className="text-sm text-gray-400 mb-6">Agrega variantes si este servicio puede personalizarse (ej. "Solo Exterior" o "Full Detailing"). Los clientes elegirán una variante, por lo que si configuras variantes aquí, los "Valores Base" del siguiente paso pueden quedar en blanco si lo deseas, o pueden servir como el valor mínimo ("Desde $X").</p>
                    <VariantsEditor initialVariants={editingService?.variants} onChange={setCurrentVariants} />
                  </div>

                  {/* PASO 3: PRECIOS Y DURACIÓN BASE */}
                  <div className={currentStep === 3 ? 'block space-y-6 animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                    <p className="text-sm text-gray-400 mb-6 border-b border-white/10 pb-4">Define los valores por defecto. Si configuraste variantes en el paso anterior, estos precios se mostrarán como "Desde $X" en la tarjeta de servicio.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Duración Total</label>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <input type="number" name="durationHours" min="0" defaultValue={editingService?.duration ? Math.floor(editingService.duration / 60) : 1} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan text-center" />
                            <span className="block text-[10px] text-gray-500 mt-1 text-center">Horas</span>
                          </div>
                          <div className="flex-1">
                            <input type="number" name="durationMins" min="0" max="59" defaultValue={editingService?.duration ? editingService.duration % 60 : 0} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-cyan text-center" />
                            <span className="block text-[10px] text-gray-500 mt-1 text-center">Minutos</span>
                          </div>
                        </div>
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
                  </div>

                  {/* PASO 4: GALERÍA */}
                  <div className={currentStep === 4 ? 'block space-y-6 animate-in fade-in slide-in-from-right-4' : 'hidden'}>
                    <div className="bg-black/40 border border-white/5 rounded-xl p-6">
                      <label className={`cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all ${isUploadingImages ? 'border-brand-cyan/50 bg-brand-cyan/5' : 'border-white/20 hover:border-brand-cyan hover:bg-brand-cyan/5'}`}>
                        {isUploadingImages ? (
                          <>
                            <svg className="animate-spin h-8 w-8 text-brand-cyan mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="text-brand-cyan text-xs font-bold uppercase tracking-widest">Subiendo imágenes...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <span className="text-gray-300 text-xs font-bold uppercase tracking-widest">Haz clic para subir imágenes</span>
                            <span className="text-gray-500 text-[10px] mt-1">Soporta JPG, PNG, WEBP</span>
                          </>
                        )}
                        <input 
                          type="file" 
                          className="hidden"
                          name="additionalImages" 
                          multiple 
                          accept="image/*" 
                          onChange={handleImageSelect}
                          disabled={isUploadingImages}
                        />
                      </label>
                      <p className="text-[10px] text-gray-500 mt-3 text-center">Las imágenes se guardan automáticamente al seleccionarlas.</p>
                      
                      {existingImages.length > 0 && (
                          <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                            {existingImages.map((img, i) => (
                              <div key={i} className="relative w-28 h-28 rounded-lg overflow-hidden group border border-white/10 shadow-lg animate-in zoom-in-95">
                                <img src={img} alt={`Gallery image ${i + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                                  <button type="button" onClick={() => setExistingImages(prev => prev.filter((_, idx) => idx !== i))} className="self-end bg-red-500 hover:bg-red-600 text-white p-1 rounded transition-colors">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                  <div className="flex justify-between w-full">
                                    <button type="button" onClick={() => moveImage(i, 'left')} disabled={i === 0} className={`p-1 rounded bg-white/20 text-white hover:bg-white/40 transition-colors ${i === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button type="button" onClick={() => moveImage(i, 'right')} disabled={i === existingImages.length - 1} className={`p-1 rounded bg-white/20 text-white hover:bg-white/40 transition-colors ${i === existingImages.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">Puedes seleccionar más de una foto. Las imágenes aparecerán en el orden mostrado arriba. Utiliza las flechas para reordenarlas una vez cargadas.</p>
                    </div>

                </form>
              </div>

              {/* Footer Fijo */}
              <div className="p-4 sm:p-6 border-t border-white/10 bg-black/40 flex flex-col gap-4 shrink-0">
                {message && (
                  <div className={`p-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 ${message.type === 'success' ? 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {message.type === 'success' ? '✓' : '⚠'} {message.text}
                  </div>
                )}
                
                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 w-full">
                  <button type="button" onClick={handleCancelForm} className="w-full sm:w-auto text-gray-500 font-bold uppercase tracking-widest text-xs px-6 py-4 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  
                  <div className="flex gap-4 w-full sm:w-auto">
                    <button 
                      disabled={saving || isUploadingImages} 
                      type="button" 
                      onClick={handleManualSubmit}
                      className="w-full bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-10 py-4 rounded-lg hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.2)]"
                    >
                      {(saving || isUploadingImages) && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-brand-pure" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                      {saving ? "Guardando..." : (editingService ? "Guardar Cambios" : "Crear Servicio")}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
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
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-10 bg-white/5 rounded-xl border border-white/10 border-dashed">
          <h3 className="text-lg font-bold text-white mb-1">No se encontraron servicios</h3>
          <p className="text-gray-400 text-sm">Prueba seleccionando otra categoría o limpiando los filtros.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredServices.map((svc) => (
            <div key={svc.id} className="bg-brand-surface/80 border border-white/10 rounded-xl p-4 hover:border-brand-cyan/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${getCategoryColor(svc.category)}`}>
                    {svc.category}
                  </span>
                  <span className="text-gray-400 text-xs font-bold flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {svc.duration >= 60 ? `${Math.floor(svc.duration / 60)}h ${svc.duration % 60 > 0 ? `${svc.duration % 60}m` : ''}` : `${svc.duration} Min`}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white uppercase tracking-wider mb-1">{svc.name}</h4>
                <p className="text-gray-500 text-xs line-clamp-1">{svc.description || "Sin descripción detallada."}</p>
                {svc.variants && svc.variants.length > 0 && (
                  <p className="text-brand-cyan text-[10px] mt-1 font-bold tracking-widest uppercase">
                    {svc.variants.length} Opciones Configuradas
                  </p>
                )}
              </div>

              <div className="flex gap-4 md:gap-6 items-center w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <div className="text-center min-w-[60px]">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">Auto</div>
                  <div className="text-white font-bold text-sm">${svc.priceAuto || 0}</div>
                </div>
                <div className="text-center min-w-[60px]">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">SUV Medianos</div>
                  <div className="text-white font-bold text-sm">${svc.priceSuv2 || 0}</div>
                </div>
                <div className="text-center min-w-[60px]">
                  <div className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">SUV Grandes</div>
                  <div className="text-white font-bold text-sm">${svc.priceSuv3 || 0}</div>
                </div>
              </div>

              <div className="flex gap-2 w-full md:w-auto shrink-0">
                <button 
                  onClick={() => handleEdit(svc)} 
                  className="px-4 text-brand-cyan hover:text-white hover:bg-brand-cyan/20 text-[10px] uppercase font-bold tracking-widest border border-brand-cyan/20 py-2 rounded transition-colors flex items-center justify-center gap-1 flex-1 md:flex-none"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Editar
                </button>
                <button 
                  onClick={() => handleDelete(svc.id)} 
                  className="px-4 text-red-400 hover:text-white hover:bg-red-500/20 text-[10px] uppercase font-bold tracking-widest border border-red-500/20 py-2 rounded transition-colors flex items-center justify-center gap-1 flex-1 md:flex-none"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

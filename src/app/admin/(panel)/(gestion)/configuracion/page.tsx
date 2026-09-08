"use client";

import React, { useState, useEffect } from "react";
import { getSettings, updateSettings } from "@/actions/admin-settings";

export default function ConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [concurrentBays, setConcurrentBays] = useState(1);
  const [slotInterval, setSlotInterval] = useState(30);
  const [advanceBookingHours, setAdvanceBookingHours] = useState(12);
  const [homeVideos, setHomeVideos] = useState<string[]>([]);
  const [storeBanners, setStoreBanners] = useState<string[]>([]);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  useEffect(() => {
    getSettings().then((settings) => {
      setStartHour(settings.workStartHour);
      setEndHour(settings.workEndHour);
      setConcurrentBays(settings.concurrentBays || 1);
      setSlotInterval(settings.slotInterval || 30);
      setAdvanceBookingHours(settings.advanceBookingHours || 12);
      setHomeVideos(settings.homeVideos || []);
      setStoreBanners(settings.storeBanners || []);
      setLoading(false);
    });
  }, []);

  const uploadFileToR2 = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al subir video");
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    const formData = new FormData();
    formData.append("workStartHour", startHour.toString());
    formData.append("workEndHour", endHour.toString());
    formData.append("concurrentBays", concurrentBays.toString());
    formData.append("slotInterval", slotInterval.toString());
    formData.append("advanceBookingHours", advanceBookingHours.toString());
    homeVideos.forEach(video => formData.append("homeVideos", video));
    storeBanners.forEach(banner => formData.append("storeBanners", banner));

    const result = await updateSettings(formData);
    
    if (result.success) {
      setMessage({ type: "success", text: "Horarios actualizados exitosamente." });
    } else {
      setMessage({ type: "error", text: result.error || "Ocurrió un error." });
    }
    
    setSaving(false);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Validar tipo de archivo
    if (!file.type.startsWith('video/')) {
      setMessage({ type: "error", text: "Por favor sube un archivo de video válido (.mp4, .webm, etc)" });
      return;
    }
    
    if (homeVideos.length >= 6) {
      setMessage({ type: "error", text: "Límite máximo de 6 videos alcanzado." });
      return;
    }

    try {
      setIsUploadingVideo(true);
      setMessage(null);
      const url = await uploadFileToR2(file);
      setHomeVideos([...homeVideos, url]);
      setMessage({ type: "success", text: "Video subido correctamente. Recuerda guardar los cambios." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error al subir el video" });
    } finally {
      setIsUploadingVideo(false);
      // Limpiar el input
      e.target.value = '';
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    if (!file.type.startsWith('image/')) {
      setMessage({ type: "error", text: "Por favor sube una imagen válida (.jpg, .png, etc)" });
      return;
    }

    try {
      setIsUploadingBanner(true);
      setMessage(null);
      const url = await uploadFileToR2(file);
      setStoreBanners([...storeBanners, url]);
      setMessage({ type: "success", text: "Banner subido correctamente. Recuerda guardar los cambios." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error al subir la imagen" });
    } finally {
      setIsUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleRemoveBanner = (index: number) => {
    setStoreBanners(storeBanners.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = (index: number) => {
    setHomeVideos(homeVideos.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="p-8 text-gray-400">Cargando configuración...</div>;
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8 border-b border-white/10 pb-4">
        <h2 className="text-lg md:text-2xl font-bold text-white uppercase tracking-widest">Configuración Global</h2>
        <p className="text-gray-400 text-sm mt-1">Administra los horarios de funcionamiento y parámetros generales de la clínica.</p>
      </div>

      <div className="max-w-2xl bg-brand-surface/50 border border-white/5 rounded-xl p-6 backdrop-blur-md">
        <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6">Horario de Operaciones</h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Hora de Apertura</label>
              <div className="relative">
                <select 
                  value={startHour}
                  onChange={(e) => setStartHour(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={`start-${i}`} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Hora de Cierre</label>
              <div className="relative">
                <select 
                  value={endHour}
                  onChange={(e) => setEndHour(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={`end-${i}`} value={i}>
                      {i.toString().padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6 mt-8 pt-6 border-t border-white/5">Capacidad Operativa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Plazas Simultáneas (Autos)</label>
              <div className="relative">
                <select 
                  value={concurrentBays}
                  onChange={(e) => setConcurrentBays(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors"
                >
                  {Array.from({ length: 10 }).map((_, i) => (
                    <option key={`bay-${i}`} value={i + 1}>
                      {i + 1} {i === 0 ? "Auto" : "Autos"} al mismo tiempo
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Intervalo de Agenda</label>
              <div className="relative">
                <select 
                  value={slotInterval}
                  onChange={(e) => setSlotInterval(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors"
                >
                  <option value={15}>Cada 15 minutos</option>
                  <option value={30}>Cada 30 minutos</option>
                  <option value={60}>Cada 1 hora</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-xs uppercase tracking-widest font-bold mb-2">Anticipación Mínima de Reserva</label>
              <div className="relative">
                <select 
                  value={advanceBookingHours}
                  onChange={(e) => setAdvanceBookingHours(parseInt(e.target.value))}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-brand-cyan transition-colors"
                >
                  <option value={1}>1 Hora (Solo hoy urgente)</option>
                  <option value={6}>6 Horas de anticipación</option>
                  <option value={12}>12 Horas de anticipación</option>
                  <option value={24}>24 Horas (Mínimo un día antes)</option>
                  <option value={48}>48 Horas (Dos días antes)</option>
                  <option value={72}>72 Horas (Tres días antes)</option>
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 italic mt-6">
            * Nota: Los cambios en el horario afectarán automáticamente los bloques disponibles en el formulario de reservas (BookingWizard) para los clientes.
          </p>

          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${
              message.type === "success" 
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-white/5">
            <button 
              type="submit"
              disabled={saving}
              className="w-full md:w-auto bg-brand-cyan text-brand-pure px-6 py-3 rounded font-bold uppercase tracking-widest text-xs hover:bg-white transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar Configuración"}
            </button>
          </div>
        </form>
      </div>

      {/* GALERÍA DE VIDEOS FRONTEND */}
      <div className="max-w-2xl mt-8 bg-brand-surface/50 border border-white/5 rounded-xl p-6 backdrop-blur-md">
        <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6">Galería de Videos (Inicio)</h3>
        <p className="text-gray-400 text-sm mb-6">Sube hasta 6 videos cortos (ej. Reels) que se reproducirán nativamente en la página principal. Recomendamos formato vertical (9:16) en .mp4 optimizado.</p>
        
        <div className="space-y-4 mb-6">
          {homeVideos.map((url, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-black/30 border border-white/5 rounded-lg p-3">
              <div className="w-16 h-24 bg-black rounded overflow-hidden flex-shrink-0 relative">
                <video src={url} className="w-full h-full object-cover" muted playsInline />
              </div>
              <div className="flex-1 text-white text-xs font-mono truncate">
                {url}
              </div>
              <button 
                type="button" 
                onClick={() => handleRemoveVideo(idx)}
                className="text-red-400 hover:text-red-300 p-2"
                title="Eliminar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}

          {homeVideos.length === 0 && (
            <div className="text-center p-8 border border-dashed border-white/10 rounded-lg text-gray-500">
              No hay videos configurados.
            </div>
          )}
        </div>

        {homeVideos.length < 6 && (
          <div className="mb-6">
            <label className={`cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all ${isUploadingVideo ? 'border-brand-cyan/50 bg-brand-cyan/5' : 'border-white/20 hover:border-brand-cyan hover:bg-brand-cyan/5'}`}>
              {isUploadingVideo ? (
                <div className="flex flex-col items-center text-brand-cyan">
                  <svg className="animate-spin mb-2 h-6 w-6 text-brand-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-bold uppercase tracking-widest">Subiendo video a la nube...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <svg className="w-8 h-8 mb-2 text-brand-cyan/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-bold uppercase tracking-widest text-white">Haz clic para subir un video</span>
                  <span className="text-xs mt-1">.mp4, .webm (Max {6 - homeVideos.length} restantes)</span>
                </div>
              )}
              <input 
                type="file" 
                className="hidden" 
                accept="video/*" 
                onChange={handleVideoUpload}
                disabled={isUploadingVideo}
              />
            </label>
          </div>
        )}
      </div>

      {/* BANNER PROMOCIONAL TIENDA FRONTEND */}
      <div className="max-w-2xl mt-8 bg-brand-surface/50 border border-white/5 rounded-xl p-6 backdrop-blur-md">
        <h3 className="text-brand-cyan text-sm uppercase tracking-widest font-bold mb-6">Banners Promocionales (Tienda)</h3>
        <p className="text-gray-400 text-sm mb-6">Sube imágenes anchas (ej. 21:9) que aparecerán destacadas en la parte superior del catálogo de la tienda. Si subes más de una, funcionarán como carrusel (Máx. 5).</p>
        
        <div className="space-y-4 mb-6">
          {storeBanners.map((url, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-black/30 border border-white/5 rounded-lg p-3">
              <div className="w-24 h-12 bg-black rounded overflow-hidden flex-shrink-0 relative">
                <img src={url} className="w-full h-full object-cover" alt="Banner" />
              </div>
              <div className="flex-1 text-white text-xs font-mono truncate">
                {url}
              </div>
              <button 
                type="button" 
                onClick={() => handleRemoveBanner(idx)}
                className="text-red-400 hover:text-red-300 p-2"
                title="Eliminar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}

          {storeBanners.length === 0 && (
            <div className="text-center p-8 border border-dashed border-white/10 rounded-lg text-gray-500">
              No hay banners configurados. Se mostrará el título por defecto.
            </div>
          )}
        </div>

        {storeBanners.length < 5 && (
          <div className="mb-6">
            <label className={`cursor-pointer flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all ${isUploadingBanner ? 'border-brand-cyan/50 bg-brand-cyan/5' : 'border-white/20 hover:border-brand-cyan hover:bg-brand-cyan/5'}`}>
              {isUploadingBanner ? (
                <div className="flex flex-col items-center text-brand-cyan">
                  <svg className="animate-spin mb-2 h-6 w-6 text-brand-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-bold uppercase tracking-widest">Subiendo imagen...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <svg className="w-8 h-8 mb-2 text-brand-cyan/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-bold uppercase tracking-widest text-white">Haz clic para subir un banner</span>
                  <span className="text-xs mt-1">.jpg, .png, .webp (Max {5 - storeBanners.length} restantes)</span>
                </div>
              )}
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleBannerUpload}
                disabled={isUploadingBanner}
              />
            </label>
          </div>
        )}

        <div className="mt-6 flex justify-end pt-4 border-t border-white/5">
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={saving || isUploadingVideo}
            className="w-full md:w-auto bg-brand-cyan text-brand-pure font-bold px-8 py-3 rounded-lg hover:bg-white transition-all flex items-center justify-center uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { getSettings, updateSettings } from "@/actions/admin-settings";
import { Screen, PageHead, CARD, INPUT, Field, Msg, PrimaryBtn } from "@/components/admin/kit";

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
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al subir archivo");
    return data.publicUrl;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("workStartHour", startHour.toString());
    formData.append("workEndHour", endHour.toString());
    formData.append("concurrentBays", concurrentBays.toString());
    formData.append("slotInterval", slotInterval.toString());
    formData.append("advanceBookingHours", advanceBookingHours.toString());
    homeVideos.forEach((v) => formData.append("homeVideos", v));
    storeBanners.forEach((b) => formData.append("storeBanners", b));
    const result = await updateSettings(formData);
    setMessage(
      result.success
        ? { type: "success", text: "Configuración guardada." }
        : { type: "error", text: result.error || "Ocurrió un error." }
    );
    setSaving(false);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setMessage({ type: "error", text: "Sube un archivo de video válido (.mp4, .webm)." });
      return;
    }
    if (homeVideos.length >= 6) {
      setMessage({ type: "error", text: "Máximo 6 videos." });
      return;
    }
    try {
      setIsUploadingVideo(true);
      setMessage(null);
      const url = await uploadFileToR2(file);
      setHomeVideos([...homeVideos, url]);
      setMessage({ type: "success", text: "Video subido. Recuerda guardar." });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setIsUploadingVideo(false);
      e.target.value = "";
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Sube una imagen válida (.jpg, .png)." });
      return;
    }
    if (storeBanners.length >= 5) {
      setMessage({ type: "error", text: "Máximo 5 banners." });
      return;
    }
    try {
      setIsUploadingBanner(true);
      setMessage(null);
      const url = await uploadFileToR2(file);
      setStoreBanners([...storeBanners, url]);
      setMessage({ type: "success", text: "Banner subido. Recuerda guardar." });
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
    } finally {
      setIsUploadingBanner(false);
      e.target.value = "";
    }
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  if (loading) {
    return (
      <Screen>
        <p className="text-gray-500 text-sm py-16 text-center">Cargando configuración…</p>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHead title="Ajustes" subtitle="Horarios, capacidad y contenido de la web." />

      {message && <Msg kind={message.type === "success" ? "ok" : "err"}>{message.text}</Msg>}

      {/* Horario y capacidad */}
      <form onSubmit={handleSubmit} className={`${CARD} space-y-4`}>
        <h2 className="text-sm font-bold text-white">Horario de operación</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Apertura">
            <select value={startHour} onChange={(e) => setStartHour(+e.target.value)} className={INPUT}>
              {hourOptions.map((i) => (
                <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
              ))}
            </select>
          </Field>
          <Field label="Cierre">
            <select value={endHour} onChange={(e) => setEndHour(+e.target.value)} className={INPUT}>
              {hourOptions.map((i) => (
                <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
              ))}
            </select>
          </Field>
        </div>

        <h2 className="text-sm font-bold text-white pt-2">Capacidad</h2>
        <Field label="Autos en paralelo">
          <select value={concurrentBays} onChange={(e) => setConcurrentBays(+e.target.value)} className={INPUT}>
            {Array.from({ length: 10 }, (_, i) => (
              <option key={i} value={i + 1}>{i + 1} {i === 0 ? "auto" : "autos"} al mismo tiempo</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Intervalo de agenda">
            <select value={slotInterval} onChange={(e) => setSlotInterval(+e.target.value)} className={INPUT}>
              <option value={15}>Cada 15 min</option>
              <option value={30}>Cada 30 min</option>
              <option value={60}>Cada 1 hora</option>
            </select>
          </Field>
          <Field label="Anticipación mínima">
            <select value={advanceBookingHours} onChange={(e) => setAdvanceBookingHours(+e.target.value)} className={INPUT}>
              <option value={1}>1 hora</option>
              <option value={6}>6 horas</option>
              <option value={12}>12 horas</option>
              <option value={24}>24 horas</option>
              <option value={48}>48 horas</option>
              <option value={72}>72 horas</option>
            </select>
          </Field>
        </div>
        <p className="text-[11px] text-gray-600">
          Afecta los bloques disponibles en el formulario de reservas de los clientes.
        </p>
        <PrimaryBtn type="submit" disabled={saving} className="w-full">
          {saving ? "Guardando…" : "Guardar configuración"}
        </PrimaryBtn>
      </form>

      {/* Videos del inicio */}
      <div className={`${CARD} space-y-3`}>
        <h2 className="text-sm font-bold text-white">Videos del inicio ({homeVideos.length}/6)</h2>
        <p className="text-[11px] text-gray-600">Reels verticales (9:16) en .mp4. Se reproducen en la portada.</p>
        <div className="space-y-2">
          {homeVideos.map((url, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-black/30 rounded-xl p-2">
              <video src={url} className="w-12 h-16 object-cover rounded-lg bg-black" muted playsInline />
              <span className="flex-1 text-[11px] text-gray-500 font-mono truncate">{url}</span>
              <button onClick={() => setHomeVideos(homeVideos.filter((_, i) => i !== idx))} className="text-red-400 p-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          ))}
        </div>
        {homeVideos.length < 6 && (
          <label className={`${INPUT} flex items-center justify-center cursor-pointer text-sm ${isUploadingVideo ? "text-brand-cyan" : "text-gray-400"}`}>
            {isUploadingVideo ? "Subiendo video…" : "+ Subir video"}
            <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} disabled={isUploadingVideo} />
          </label>
        )}
      </div>

      {/* Banners de la tienda */}
      <div className={`${CARD} space-y-3`}>
        <h2 className="text-sm font-bold text-white">Banners de la tienda ({storeBanners.length}/5)</h2>
        <p className="text-[11px] text-gray-600">Imágenes anchas (21:9) sobre el catálogo. Varias = carrusel.</p>
        <div className="space-y-2">
          {storeBanners.map((url, idx) => (
            <div key={idx} className="flex items-center gap-3 bg-black/30 rounded-xl p-2">
              <img src={url} className="w-20 h-10 object-cover rounded-lg bg-black" alt="" />
              <span className="flex-1 text-[11px] text-gray-500 font-mono truncate">{url}</span>
              <button onClick={() => setStoreBanners(storeBanners.filter((_, i) => i !== idx))} className="text-red-400 p-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          ))}
        </div>
        {storeBanners.length < 5 && (
          <label className={`${INPUT} flex items-center justify-center cursor-pointer text-sm ${isUploadingBanner ? "text-brand-cyan" : "text-gray-400"}`}>
            {isUploadingBanner ? "Subiendo banner…" : "+ Subir banner"}
            <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} disabled={isUploadingBanner} />
          </label>
        )}
        <PrimaryBtn type="button" onClick={() => handleSubmit()} disabled={saving || isUploadingVideo || isUploadingBanner} className="w-full">
          {saving ? "Guardando…" : "Guardar cambios"}
        </PrimaryBtn>
      </div>
    </Screen>
  );
}

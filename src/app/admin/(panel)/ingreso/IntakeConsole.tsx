"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { lookupByPlate, registerIntake, markDelivered, type PlateLookup } from "@/actions/intake";
import { formatPlate, normalizePlate } from "@/lib/plate";

type InShop = {
  id: string;
  plate: string;
  make: string;
  model: string;
  clientName: string;
  clientPhone: string | null;
  photoUrl: string | null;
  notes: string | null;
  staffName: string | null;
  createdAt: string;
};

type TodayBooking = {
  id: string;
  startTime: string;
  customerName: string;
  vehicleMake: string;
  vehicleModel: string;
};

const field =
  "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan";
const label = "block text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-1.5";

export default function IntakeConsole({
  inShop,
  todayBookings,
}: {
  inShop: InShop[];
  todayBookings: TodayBooking[];
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"search" | "form">("search");
  const [plate, setPlate] = useState("");
  const [lookup, setLookup] = useState<PlateLookup | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    const p = normalizePlate(plate);
    if (p.length < 4) {
      setMsg({ type: "err", text: "Ingresá una patente válida." });
      return;
    }
    setSearching(true);
    setMsg(null);
    const res = await lookupByPlate(p);
    setLookup(res);
    setPlate(p);
    setPhase("form");
    setSearching(false);
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || "Fallo al subir");
      setPhotoUrl(data.publicUrl);
    } catch (err) {
      setMsg({ type: "err", text: "No se pudo subir la foto: " + (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function doRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    fd.set("photoUrl", photoUrl);
    const res = await registerIntake(fd);
    setSubmitting(false);

    if (res.success) {
      setMsg({ type: "ok", text: `Ingreso registrado — ${formatPlate(res.plate)}` });
      setPhase("search");
      setPlate("");
      setLookup(null);
      setPhotoUrl("");
      router.refresh();
    } else {
      setMsg({ type: "err", text: res.error });
    }
  }

  async function deliver(id: string) {
    if (!confirm("¿Marcar este vehículo como entregado?")) return;
    const res = await markDelivered(id);
    if (res.success) router.refresh();
    else alert(res.error);
  }

  const c = lookup?.client;
  const v = lookup?.vehicle;
  const known = lookup?.found;

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`p-3 rounded-xl text-sm font-semibold border ${
            msg.type === "ok"
              ? "bg-green-500/10 text-green-400 border-green-500/25"
              : "bg-red-500/10 text-red-400 border-red-500/25"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* ── Paso 1: buscar patente ── */}
      {phase === "search" && (
        <form onSubmit={doSearch} className="bg-brand-surface border border-white/10 rounded-2xl p-5">
          <label className={label}>Patente del vehículo</label>
          <input
            autoFocus
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="BBBB12"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className={`${field} text-center text-2xl font-black tracking-[0.3em]`}
          />
          <button
            type="submit"
            disabled={searching}
            className="mt-4 w-full bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm py-4 rounded-xl disabled:opacity-50"
          >
            {searching ? "Buscando…" : "Buscar / Ingresar vehículo"}
          </button>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Si la patente ya existe, los datos del cliente se cargan solos.
          </p>
        </form>
      )}

      {/* ── Paso 2: formulario de ingreso ── */}
      {phase === "form" && (
        <form onSubmit={doRegister} className="bg-brand-surface border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-white tracking-[0.15em]">
              {formatPlate(plate)}
            </span>
            <button
              type="button"
              onClick={() => {
                setPhase("search");
                setLookup(null);
                setPhotoUrl("");
              }}
              className="text-xs font-semibold text-gray-400 bg-white/5 px-3 py-1.5 rounded-full"
            >
              Cambiar
            </button>
          </div>

          <div
            className={`text-xs font-semibold px-3 py-2 rounded-lg border ${
              known
                ? "bg-green-500/10 text-green-400 border-green-500/25"
                : "bg-amber-500/10 text-amber-400 border-amber-500/25"
            }`}
          >
            {known
              ? "Cliente ya registrado — revisá los datos y confirmá."
              : "Patente nueva — completá los datos del cliente."}
          </div>

          {lookup?.openIntakeId && (
            <div className="text-xs font-semibold px-3 py-2 rounded-lg border bg-red-500/10 text-red-400 border-red-500/25">
              Ojo: este vehículo ya figura EN EL TALLER (más abajo). Registrar de
              nuevo crea un segundo ingreso.
            </div>
          )}

          <input type="hidden" name="plate" value={plate} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Marca</label>
              <input name="make" required defaultValue={v?.make ?? ""} placeholder="Toyota" className={field} />
            </div>
            <div>
              <label className={label}>Modelo</label>
              <input name="model" required defaultValue={v?.model ?? ""} placeholder="Yaris" className={field} />
            </div>
          </div>
          <div>
            <label className={label}>Color (opcional)</label>
            <input name="color" defaultValue={v?.color ?? ""} placeholder="Gris" className={field} />
          </div>

          <div className="h-px bg-white/5 my-1" />

          <div>
            <label className={label}>Nombre del cliente</label>
            <input
              name="clientName"
              required
              defaultValue={c?.name ?? ""}
              placeholder="Nombre y apellido"
              className={field}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>RUT (opcional)</label>
              <input name="clientRut" defaultValue={c?.rut ?? ""} placeholder="12345678-9" className={field} />
            </div>
            <div>
              <label className={label}>Teléfono</label>
              <input
                name="clientPhone"
                inputMode="tel"
                defaultValue={c?.phone ?? ""}
                placeholder="+56 9 …"
                className={field}
              />
            </div>
          </div>
          <div>
            <label className={label}>Correo (opcional)</label>
            <input
              name="clientEmail"
              type="email"
              inputMode="email"
              defaultValue={c?.email ?? ""}
              placeholder="cliente@correo.com"
              className={field}
            />
          </div>

          <div className="h-px bg-white/5 my-1" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Kilometraje</label>
              <input name="odometer" inputMode="numeric" placeholder="Opcional" className={field} />
            </div>
            <div>
              <label className={label}>Reserva de hoy</label>
              <select name="bookingId" defaultValue="" className={field}>
                <option value="">Sin reserva</option>
                {todayBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.startTime} · {b.customerName} ({b.vehicleMake} {b.vehicleModel})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Observaciones de recepción</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Rayones, detalles, estado general…"
              className={field}
            />
          </div>

          {/* Foto */}
          <div>
            <label className={label}>Foto del vehículo (opcional)</label>
            {photoUrl ? (
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-white/10">
                <Image src={photoUrl} alt="Vehículo" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoUrl("")}
                  className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-28 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-gray-400 gap-2 disabled:opacity-50"
              >
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.6}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <circle cx="12" cy="13" r="3" strokeWidth={1.6} />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-widest">
                  {uploading ? "Subiendo…" : "Tomar / elegir foto"}
                </span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadPhoto(f);
                e.target.value = "";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-sm py-4 rounded-xl disabled:opacity-50"
          >
            {submitting ? "Registrando…" : "Registrar ingreso"}
          </button>
        </form>
      )}

      {/* ── En el taller ahora ── */}
      <section>
        <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-3">
          En el taller ahora
          <span className="ml-2 text-xs text-gray-500">{inShop.length}</span>
        </h2>
        {inShop.length === 0 ? (
          <p className="text-sm text-gray-500">No hay vehículos ingresados.</p>
        ) : (
          <ul className="space-y-2">
            {inShop.map((i) => (
              <li
                key={i.id}
                className="bg-brand-surface border border-white/8 rounded-2xl p-3 flex items-center gap-3"
              >
                {i.photoUrl ? (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0">
                    <Image src={i.photoUrl} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-gray-600 text-lg font-black">
                    {i.make.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white">{formatPlate(i.plate)}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {i.make} {i.model} · {i.clientName}
                  </div>
                </div>
                <button
                  onClick={() => deliver(i.id)}
                  className="shrink-0 text-xs font-bold uppercase tracking-widest text-green-400 border border-green-500/25 bg-green-500/10 px-3 py-2 rounded-lg"
                >
                  Entregar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

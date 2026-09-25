"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { lookupByPlate, registerIntake, type PlateLookup } from "@/actions/intake";
import { formatPlate, normalizePlate } from "@/lib/plate";
import { uploadFileToR2 } from "@/lib/uploadClient";

type TodayBooking = {
  id: string;
  startTime: string;
  customerName: string;
  vehicleMake: string;
  vehicleModel: string;
};

type Service = {
  id: string;
  name: string;
  priceAuto: number | null;
  category: string;
};

const field =
  "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan";
const label = "block text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-1.5";

export default function IntakeConsole({
  todayBookings,
  services = [],
  initial,
}: {
  todayBookings: TodayBooking[];
  services?: Service[];
  /** Llegada de una reserva desde el Tablero: datos precargados. */
  initial?: { bookingId: string; plate: string; lookup: PlateLookup };
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"search" | "form">(initial?.plate ? "form" : "search");
  const [plate, setPlate] = useState(initial?.plate ?? "");
  const [lookup, setLookup] = useState<PlateLookup | null>(initial?.lookup ?? null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedBookingId, setSelectedBookingId] = useState(initial?.bookingId ?? "");

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
    setSelectedBookingId(initial?.bookingId ?? "");
    setPhase("form");
    setSearching(false);
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setMsg(null);
    try {
      const url = await uploadFileToR2(file);
      setPhotoUrl(url);
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
    
    // Si no hay reserva seleccionada y no se seleccionaron servicios ni servicio personalizado
    if (!selectedBookingId) {
      const selectedServices = fd.getAll("serviceIds");
      const customDetail = fd.get("customServiceDetail") as string;
      if (selectedServices.length === 0 && !customDetail.trim()) {
        setMsg({ type: "err", text: "Debes seleccionar al menos un servicio o ingresar uno personalizado." });
        setSubmitting(false);
        return;
      }
    }

    const res = await registerIntake(fd);
    setSubmitting(false);

    if (res.success) {
      // De vuelta al Tablero: el auto aparece en "En espera".
      router.push("/admin");
      router.refresh();
    } else {
      setMsg({ type: "err", text: res.error });
    }
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
                setSelectedBookingId("");
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
              Ojo: este vehículo ya figura EN EL TALLER (ver Tablero). Registrar de
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
                required
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
              <label className={label}>Vincular Reserva Web</label>
              <select 
                name="bookingId" 
                value={selectedBookingId}
                onChange={(e) => setSelectedBookingId(e.target.value)}
                className={field}
              >
                <option value="">Sin reserva (Ingreso Presencial)</option>
                {todayBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.startTime} · {b.customerName} ({b.vehicleMake} {b.vehicleModel})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SERVICIOS - Solo visible si NO hay una reserva web seleccionada */}
          {!selectedBookingId && (
            <div className="mt-4 p-4 border border-brand-cyan/30 bg-brand-cyan/5 rounded-2xl">
              <h3 className="text-sm font-bold text-brand-cyan uppercase tracking-widest mb-3">
                Cotización de Servicios
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Al registrar este ingreso sin reserva web, se creará automáticamente una cita en la Agenda con los siguientes servicios.
              </p>
              
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 mb-4">
                {services.map(s => (
                  <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10">
                    <input 
                      type="checkbox" 
                      name="serviceIds" 
                      value={s.id} 
                      className="w-4 h-4 rounded border-gray-600 text-brand-cyan focus:ring-brand-cyan bg-black"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{s.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase">{s.category}</div>
                    </div>
                    <div className="text-sm font-bold text-brand-cyan shrink-0">
                      ${(s.priceAuto || 0).toLocaleString("es-CL")}
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-brand-cyan/20">
                <label className={label}>Otro Servicio (Personalizado)</label>
                <div className="grid grid-cols-[1fr_120px] gap-2 mt-2">
                  <input 
                    name="customServiceDetail" 
                    maxLength={200}
                    placeholder="Detalle del trabajo..." 
                    className={`${field} py-2 text-sm`} 
                  />
                  <input 
                    name="customServicePrice" 
                    type="number" 
                    min={0}
                    step={1}
                    placeholder="Precio ($)" 
                    className={`${field} py-2 text-sm`} 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
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

    </div>
  );
}

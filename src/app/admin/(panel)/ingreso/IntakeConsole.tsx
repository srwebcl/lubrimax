"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { lookupByPlate, registerIntake, type PlateLookup } from "@/actions/intake";
import { formatPlate, normalizePlate } from "@/lib/plate";
import { uploadFileToR2 } from "@/lib/uploadClient";
import { NameInput, OdometerInput, PhoneInput, RutInput } from "@/components/admin/ContactInputs";
import { VEHICLE_TYPES, getExactPrice, type ServiceVariant, type VehicleType } from "@/lib/booking-constants";

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
  priceSuv2: number | null;
  priceSuv3: number | null;
  /** Opciones del servicio (igual que en la agenda web). */
  variants: ServiceVariant[];
  category: string;
  /** Mecánica: va al final de la lista (ver ingreso/page.tsx). */
  isMechanic: boolean;
};

/** Minúsculas y sin tildes, para buscar "mecanica" = "Mecánica". */
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const field =
  "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan";
const label = "block text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-1.5";

export default function IntakeConsole({
  todayBookings,
  services = [],
  initial,
  canDiscount = false,
}: {
  todayBookings: TodayBooking[];
  services?: Service[];
  /** Puede aplicar descuentos (permiso "Ajustar precios"; el admin siempre). */
  canDiscount?: boolean;
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
  const [checkedServices, setCheckedServices] = useState<Set<string>>(new Set());
  // Tipo de vehículo: define el precio de catálogo (igual que la reserva web).
  // Se precarga si el vehículo ya es conocido.
  const [vehicleType, setVehicleType] = useState<VehicleType | "">(initial?.lookup.vehicle?.vehicleType ?? "");
  // Opción elegida por servicio (ej. Detailing Exterior → "Cerámico (2 años)").
  const [variantOf, setVariantOf] = useState<Record<string, string>>({});
  const priceFor = (s: Service) => {
    if (!vehicleType) return 0;
    const variant = s.variants.find((v) => v.name === variantOf[s.id]);
    return getExactPrice(variant ?? s, vehicleType);
  };
  const [odometerLower, setOdometerLower] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const [manualPrices, setManualPrices] = useState<Record<string, string>>({});

  function toggleService(id: string) {
    const service = services.find((s) => s.id === id);
    setCheckedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Como en la web: al marcar un servicio con opciones, se preselecciona la primera.
    if (service && service.variants.length > 0 && !variantOf[id]) {
      setVariantOf((p) => ({ ...p, [id]: service.variants[0].name }));
    }
  }

  // Total estimado de los servicios marcados (catálogo + precios manuales).
  let estimatedTotal = 0;
  let pendingEvaluation = 0;
  for (const s of services) {
    if (!checkedServices.has(s.id)) continue;
    if (priceFor(s)) estimatedTotal += priceFor(s);
    else if (manualPrices[s.id]) estimatedTotal += Number(manualPrices[s.id]) || 0;
    else pendingEvaluation++;
  }

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
    setVehicleType(res.vehicle?.vehicleType ?? "");
    setPlate(p);
    setSelectedBookingId(initial?.bookingId ?? "");
    setCheckedServices(new Set());
    setVariantOf({});
    setManualPrices({});
    setCustomPrice("");
    setDiscountValue("");
    setOdometerLower(false);
    setServiceQuery("");
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

    if (
      odometerLower &&
      !confirm("El kilometraje es MENOR al último registrado. ¿Es correcto (por ejemplo, cambio de odómetro)?")
    ) {
      setSubmitting(false);
      return;
    }
    
    // Si no hay reserva seleccionada y no se seleccionaron servicios ni servicio personalizado
    if (!selectedBookingId) {
      const selectedServices = fd.getAll("serviceIds");
      const customDetail = fd.get("customServiceDetail") as string;
      if (!vehicleType) {
        setMsg({ type: "err", text: "Selecciona el tipo de vehículo para calcular el precio." });
        setSubmitting(false);
        return;
      }
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
  const fromWeb = lookup?.source === "WEB";

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
                setCheckedServices(new Set());
                setVariantOf({});
                setManualPrices({});
                setCustomPrice("");
                setDiscountValue("");
                setOdometerLower(false);
                setServiceQuery("");
                setVehicleType("");
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
                : fromWeb
                  ? "bg-sky-500/10 text-sky-400 border-sky-500/25"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/25"
            }`}
          >
            {known
              ? "Cliente ya registrado — revisa los datos y confirma."
              : fromWeb
                ? "Cliente conocido por una reserva web — revisa sus datos; al registrar queda como cliente del taller."
                : "Patente nueva — completa los datos del cliente."}
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

          {/* key: al cambiar de patente se remontan con los datos nuevos */}
          <div key={`client-${plate}`} className="space-y-4">
            <div>
              <label className={label}>Nombre del cliente</label>
              <NameInput name="clientName" required defaultValue={c?.name ?? ""} placeholder="Nombre Apellido" className={field} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={label}>Celular</label>
                <PhoneInput name="clientPhone" required defaultValue={c?.phone} className={field} />
              </div>
              <div>
                <label className={label}>RUT (opcional)</label>
                <RutInput name="clientRut" defaultValue={c?.rut} className={field} />
              </div>
            </div>
            <div>
              <label className={label}>Correo</label>
              <input
                name="clientEmail"
                type="email"
                inputMode="email"
                required
                defaultValue={c?.email ?? ""}
                placeholder="cliente@correo.com"
                className={field}
              />
            </div>
          </div>

          <div className="h-px bg-white/5 my-1" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Kilometraje</label>
              <OdometerInput
                key={`odo-${plate}`}
                name="odometer"
                className={field}
                last={lookup?.lastOdometer}
                onLowerChange={setOdometerLower}
              />
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

              {/* Tipo de vehículo: define el precio, igual que al agendar por la web */}
              <label className={label}>Tipo de vehículo</label>
              <input type="hidden" name="vehicleType" value={vehicleType} />
              <div className="grid grid-cols-3 gap-2 mb-4">
                {VEHICLE_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setVehicleType(t)}
                    className={`min-h-12 px-2 py-2 rounded-xl text-[11px] leading-tight font-bold border transition-colors ${
                      vehicleType === t
                        ? "bg-brand-cyan text-black border-brand-cyan"
                        : "bg-white/5 text-gray-300 border-white/10"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {!vehicleType && (
                <p className="text-xs text-amber-400 mb-3">Selecciona el tipo de vehículo para ver los precios.</p>
              )}

              <input
                type="search"
                value={serviceQuery}
                onChange={(e) => setServiceQuery(e.target.value)}
                placeholder="Buscar servicio…"
                className={`${field} py-2 text-sm mb-3`}
              />

              <div className="space-y-2 max-h-72 overflow-y-auto pr-2 mb-4">
                {services.map((s, idx) => {
                  const checked = checkedServices.has(s.id);
                  // Los que no coinciden se OCULTAN (no se quitan del DOM): así
                  // un servicio ya marcado sigue enviándose aunque se filtre.
                  const q = fold(serviceQuery.trim());
                  const visible = !q || fold(`${s.name} ${s.category}`).includes(q);
                  const firstMechanic = s.isMechanic && !services[idx - 1]?.isMechanic;
                  // Sin precio de catálogo (ej. mecánica): el precio depende de
                  // la evaluación y se ingresa a mano al seleccionarlo.
                  const price = priceFor(s);
                  const toEvaluate = !!vehicleType && !price;
                  return (
                    <React.Fragment key={s.id}>
                    {firstMechanic && !q && (
                      <div className="pt-2 pb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-amber-400/80 border-t border-white/5">
                        Mecánica · precio según evaluación
                      </div>
                    )}
                    <div className={`rounded-lg border transition-colors ${visible ? "" : "hidden"} ${checked ? "border-brand-cyan/30 bg-white/[0.03]" : "border-transparent"}`}>
                      <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          name="serviceIds" 
                          value={s.id} 
                          checked={checked}
                          onChange={() => toggleService(s.id)}
                          className="w-4 h-4 rounded border-gray-600 text-brand-cyan focus:ring-brand-cyan bg-black"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{s.name}</div>
                          <div className="text-[10px] text-gray-500 uppercase">{s.category}</div>
                        </div>
                        <div className={`text-sm font-bold shrink-0 ${toEvaluate ? "text-amber-400" : "text-brand-cyan"}`}>
                          {!vehicleType
                            ? "—"
                            : toEvaluate
                              ? "A evaluar"
                              : `${s.variants.length > 0 && !checked ? "Desde " : ""}$${price.toLocaleString("es-CL")}`}
                        </div>
                      </label>
                      {checked && s.variants.length > 0 && (
                        <div className="px-2 pb-2 pl-9">
                          <label className="block text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Opción</label>
                          <select
                            name={`variant:${s.id}`}
                            value={variantOf[s.id] ?? s.variants[0].name}
                            onChange={(e) => setVariantOf((p) => ({ ...p, [s.id]: e.target.value }))}
                            className={`${field} py-2 text-sm`}
                          >
                            {s.variants.map((v) => (
                              <option key={v.name} value={v.name}>
                                {v.name}
                                {vehicleType ? ` — $${getExactPrice(v, vehicleType).toLocaleString("es-CL")}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {checked && toEvaluate && (
                        <div className="px-2 pb-2 pl-9">
                          <input
                            name={`manualPrice:${s.id}`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={manualPrices[s.id] ?? ""}
                            onChange={(e) => setManualPrices((p) => ({ ...p, [s.id]: e.target.value }))}
                            placeholder="Precio según evaluación ($) — opcional"
                            className={`${field} py-2 text-sm`}
                          />
                        </div>
                      )}
                    </div>
                    </React.Fragment>
                  );
                })}
                {serviceQuery.trim() &&
                  !services.some((s) => fold(`${s.name} ${s.category}`).includes(fold(serviceQuery.trim()))) && (
                    <p className="text-xs text-gray-500 px-2 py-3">
                      Sin resultados. Puedes usar &quot;Otro servicio (personalizado)&quot; más abajo.
                    </p>
                  )}
              </div>

              {checkedServices.size > 0 && (
                <div className="flex justify-between items-center text-xs mb-4 px-1">
                  <span className="text-gray-400 uppercase tracking-widest">Total servicios</span>
                  <span className="text-white font-bold">
                    ${estimatedTotal.toLocaleString("es-CL")}
                    {pendingEvaluation > 0 && (
                      <span className="text-amber-400 font-semibold"> + {pendingEvaluation} por evaluar</span>
                    )}
                  </span>
                </div>
              )}

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
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="Precio ($)" 
                    className={`${field} py-2 text-sm`} 
                  />
                </div>
              </div>

              {/* Descuento sobre el total de los servicios */}
              {canDiscount && (() => {
                const subtotal = estimatedTotal + (Number(customPrice) || 0);
                const value = Number(discountValue) || 0;
                const off =
                  discountType === "PERCENT"
                    ? Math.round((subtotal * Math.min(value, 100)) / 100)
                    : Math.min(value, subtotal);
                const invalid = discountType === "PERCENT" ? value > 100 : value > subtotal;
                return (
                  <div className="pt-4 mt-4 border-t border-brand-cyan/20">
                    <label className={label}>Descuento (opcional)</label>
                    <div className="grid grid-cols-[auto_1fr] gap-2">
                      <div className="flex rounded-xl border border-white/10 overflow-hidden">
                        {(["PERCENT", "AMOUNT"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDiscountType(t)}
                            className={`px-4 text-sm font-bold ${discountType === t ? "bg-brand-cyan text-black" : "bg-white/5 text-gray-300"}`}
                          >
                            {t === "PERCENT" ? "%" : "$"}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={discountType === "PERCENT" ? 100 : undefined}
                        step={1}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === "PERCENT" ? "Ej: 10" : "Ej: 5000"}
                        className={`${field} py-2 text-sm ${invalid ? "border-red-500/60" : ""}`}
                      />
                    </div>
                    <input type="hidden" name="discountType" value={value > 0 ? discountType : ""} />
                    <input type="hidden" name="discountValue" value={value > 0 ? String(value) : ""} />
                    {invalid && (
                      <p className="text-[11px] text-red-400 mt-1">
                        {discountType === "PERCENT" ? "Máximo 100%." : "No puede superar el total de los servicios."}
                      </p>
                    )}
                    {subtotal > 0 && (
                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex justify-between text-gray-400">
                          <span>Subtotal</span>
                          <span>${subtotal.toLocaleString("es-CL")}</span>
                        </div>
                        {off > 0 && !invalid && (
                          <div className="flex justify-between text-green-400">
                            <span>Descuento{discountType === "PERCENT" ? ` (${Math.min(value, 100)}%)` : ""}</span>
                            <span>−${off.toLocaleString("es-CL")}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-white font-bold text-sm pt-1 border-t border-white/10">
                          <span>Total</span>
                          <span>${(subtotal - (invalid ? 0 : off)).toLocaleString("es-CL")}</span>
                        </div>
                        {pendingEvaluation > 0 && (
                          <p className="text-[11px] text-amber-400">
                            + {pendingEvaluation} servicio(s) por evaluar (el descuento en % también se les aplica).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
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

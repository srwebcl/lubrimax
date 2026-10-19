"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Sheet, PrimaryBtn, GhostBtn, INPUT, LABEL } from "@/components/admin/kit";
import {
  getBookingServicesDetails,
  updateBookingServices,
  type UpdateBookingServicesInput,
} from "@/actions/admin-booking-services";
import { VEHICLE_TYPES, type VehicleType, servicePriceFor } from "@/lib/booking-constants";

type CatalogService = {
  id: string;
  name: string;
  category: string;
  variants: { name: string; priceAuto: number | null; priceSuv2: number | null; priceSuv3: number | null }[];
  priceAuto: number | null;
  priceSuv2: number | null;
  priceSuv3: number | null;
};

type BookingDetails = {
  id: string;
  customerName: string;
  customerPhone: string;
  vehicleMake: string;
  vehicleModel: string;
  plate: string | null;
  vehicleType: VehicleType;
  currentServiceIds: string[];
  selectedVariants: Record<string, string>;
  manualPrices: Record<string, number>;
  customService: { detail: string; price: number } | null;
  discount: { type: "PERCENT" | "AMOUNT"; value: number } | null;
  totalPrice: number;
  paid: number;
  balance: number;
  paymentType: string | null;
};

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;

export default function EditBookingServicesSheet({
  bookingId,
  onClose,
  onSaved,
}: {
  bookingId: string | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [catalog, setCatalog] = useState<CatalogService[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});
  const [customDetail, setCustomDetail] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>(VEHICLE_TYPES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Cargar detalles de la reserva y el catálogo cuando se abre el modal
  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMsg(null);

    getBookingServicesDetails(bookingId).then((res) => {
      if (!active) return;
      setLoading(false);
      if (res.success && res.booking) {
        setBooking(res.booking);
        setCatalog(res.catalog);
        setSelectedIds(new Set(res.booking.currentServiceIds));
        setVariants({ ...res.booking.selectedVariants });
        setManualPrices({ ...res.booking.manualPrices });
        setVehicleType(res.booking.vehicleType);
        if (res.booking.customService) {
          setCustomDetail(res.booking.customService.detail);
          setCustomPrice(res.booking.customService.price ? String(res.booking.customService.price) : "");
        } else {
          setCustomDetail("");
          setCustomPrice("");
        }
      } else {
        setErrorMsg(res.error || "No se pudo cargar la información de la reserva.");
      }
    });

    return () => {
      active = false;
    };
  }, [bookingId]);

  if (!bookingId) return null;

  const toggleService = (id: string) => {
    const s = catalog.find((item) => item.id === id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Preseleccionar primera variante si el servicio tiene opciones y no hay una elegida
        if (s && s.variants.length > 0 && !variants[id]) {
          setVariants((v) => ({ ...v, [id]: s.variants[0].name }));
        }
      }
      return next;
    });
  };

  const getServicePrice = (s: CatalogService) => {
    const variantName = variants[s.id];
    const catPrice = servicePriceFor(s, vehicleType, variantName);
    if (catPrice > 0) return catPrice;
    return manualPrices[s.id] || 0;
  };

  // Cálculo en tiempo real del nuevo total y saldo
  let calculatedCatalogSubtotal = 0;
  for (const id of selectedIds) {
    const s = catalog.find((item) => item.id === id);
    if (s) {
      calculatedCatalogSubtotal += getServicePrice(s);
    }
  }

  const customNumPrice = Number(customPrice) || 0;
  const newSubtotal = calculatedCatalogSubtotal + customNumPrice;
  const newTotal = newSubtotal;
  const paidAmount = booking?.paid || 0;
  const newBalance = Math.max(newTotal - paidAmount, 0);

  const handleSave = () => {
    setErrorMsg(null);
    if (selectedIds.size === 0 && !customDetail.trim()) {
      setErrorMsg("La reserva debe tener al menos un servicio o un servicio personalizado.");
      return;
    }

    startTransition(async () => {
      const input: UpdateBookingServicesInput = {
        bookingId,
        serviceIds: [...selectedIds],
        variants,
        manualPrices,
        customService: customDetail.trim()
          ? { detail: customDetail.trim(), price: customNumPrice }
          : null,
      };

      const res = await updateBookingServices(input);
      if (res.success) {
        if (onSaved) onSaved();
        onClose();
      } else {
        setErrorMsg(res.error || "Error al guardar los cambios.");
      }
    });
  };

  // Servicios agrupados por categoría para la búsqueda
  const filteredCatalog = catalog.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q);
  });

  return (
    <Sheet open={!!bookingId} onClose={onClose} title="Modificar Servicios de la Reserva">
      <div className="space-y-5">
        {loading ? (
          <div className="py-12 text-center text-sm text-brand-cyan animate-pulse">
            Cargando servicios de la reserva...
          </div>
        ) : booking ? (
          <>
            {/* Resumen del Cliente y Vehículo */}
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-white">{booking.customerName}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {booking.vehicleMake} {booking.vehicleModel}
                  {booking.plate && (
                    <span className="ml-2 font-mono font-bold text-yellow-300">
                      [{booking.plate}]
                    </span>
                  )}
                </div>
              </div>

              {/* Selector de Tipo de Vehículo para Precios */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Tipo:</span>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="rounded-xl border border-white/10 bg-black/50 px-2.5 py-1.5 text-xs text-white focus:border-brand-cyan focus:outline-none"
                >
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-gray-900 text-white">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparativa de Montos: Total, Pagado y Nuevo Saldo */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Nuevo Total</div>
                <div className="text-lg font-black text-white">{clp(newTotal)}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Antes: {clp(booking.totalPrice)}</div>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Pagado</div>
                <div className="text-lg font-black text-green-400">{clp(paidAmount)}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {booking.paymentType ? "Webpay / Pago inicial" : "Cobrado"}
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/8 p-3">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Nuevo Saldo</div>
                <div className={`text-lg font-black ${newBalance > 0 ? "text-amber-400" : "text-green-400"}`}>
                  {clp(newBalance)}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {newBalance > 0 ? "A cobrar en local" : "Sin saldo"}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/25">
                {errorMsg}
              </div>
            )}

            {/* Buscador de Servicios del Catálogo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={LABEL}>Agregar / Quitar Servicios del Catálogo</label>
                <span className="text-xs text-brand-cyan font-bold">{selectedIds.size} seleccionados</span>
              </div>
              <input
                type="search"
                placeholder="Buscar servicio (ej. lavado, motor, tapiz, cerámico)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={INPUT}
              />
            </div>

            {/* Listado de Servicios */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {filteredCatalog.map((s) => {
                const isSelected = selectedIds.has(s.id);
                const wasOriginal = booking.currentServiceIds.includes(s.id);
                const currentPrice = getServicePrice(s);

                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      isSelected
                        ? "bg-brand-cyan/10 border-brand-cyan/40"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleService(s.id)}
                          className="w-4 h-4 rounded border-white/20 bg-black/40 text-brand-cyan focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{s.name}</span>
                            {wasOriginal && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                                Inicial Web
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500">{s.category}</div>
                        </div>
                      </label>

                      <div className="text-right">
                        <div className="text-sm font-bold text-brand-cyan">
                          {currentPrice > 0 ? clp(currentPrice) : "A evaluar"}
                        </div>
                      </div>
                    </div>

                    {/* Selector de Opciones / Variantes si está seleccionado y tiene opciones */}
                    {isSelected && s.variants.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-2">
                        <span className="text-[11px] text-gray-400 font-semibold">Opción:</span>
                        <select
                          value={variants[s.id] || s.variants[0]?.name}
                          onChange={(e) => setVariants((v) => ({ ...v, [s.id]: e.target.value }))}
                          className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white focus:border-brand-cyan focus:outline-none"
                        >
                          {s.variants.map((v) => (
                            <option key={v.name} value={v.name} className="bg-gray-900 text-white">
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Entrada de Precio Manual si el servicio es "a evaluar" */}
                    {isSelected && currentPrice === 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-2">
                        <span className="text-[11px] text-amber-300 font-semibold">Precio a evaluar:</span>
                        <input
                          type="number"
                          placeholder="$ Monto CLP"
                          value={manualPrices[s.id] || ""}
                          onChange={(e) =>
                            setManualPrices((m) => ({ ...m, [s.id]: Number(e.target.value) || 0 }))
                          }
                          className="w-32 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs text-white focus:border-brand-cyan focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Servicio Personalizado Adicional */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 space-y-2">
              <label className={LABEL}>+ Servicio Personalizado (Opcional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Detalle (ej. Desabolladura puerta)"
                  value={customDetail}
                  onChange={(e) => setCustomDetail(e.target.value)}
                  className={`${INPUT} sm:col-span-2 py-2 text-xs`}
                />
                <input
                  type="number"
                  placeholder="Precio $"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className={`${INPUT} py-2 text-xs`}
                />
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-2.5 pt-2">
              <GhostBtn type="button" onClick={onClose} className="flex-1">
                Cancelar
              </GhostBtn>
              <PrimaryBtn
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? "Guardando..." : "Guardar Servicios"}
              </PrimaryBtn>
            </div>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}

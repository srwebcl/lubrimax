"use client";

import React, { useMemo, useState } from "react";
import { updateBookingStatus, updateWorkStatus } from "@/actions/admin-bookings";
import { format, isToday, isSameWeek, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

type Role = "ADMIN" | "WORKER";

type Booking = {
  id: string;
  date: string; // ISO
  startTime: string;
  endTime: string;
  status: string;
  workStatus: string;
  paymentStatus: string;
  arrived?: boolean;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  vehicleMake: string;
  vehicleModel: string;
  services: { name: string; duration: number }[];
};

const WORK_STEPS = [
  { value: "PENDING", short: "Por hacer" },
  { value: "IN_PROGRESS", short: "En proceso" },
  { value: "DONE", short: "Terminado" },
] as const;

const FILTERS = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "all", label: "Todas" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

function workAccent(v: string) {
  if (v === "DONE") return "text-green-400";
  if (v === "IN_PROGRESS") return "text-amber-400";
  return "text-gray-500";
}

function statusPill(status: string) {
  switch (status) {
    case "CONFIRMED":
      return { label: "Confirmada", cls: "bg-green-500/10 text-green-400 border-green-500/25" };
    case "CANCELLED":
      return { label: "Cancelada", cls: "bg-red-500/10 text-red-400 border-red-500/25" };
    case "PENDING":
      return { label: "Pendiente", cls: "bg-yellow-500/10 text-yellow-500 border-yellow-500/25" };
    default:
      return { label: status, cls: "bg-white/5 text-gray-300 border-white/10" };
  }
}

export default function BookingsManager({
  initialBookings,
  role,
}: {
  initialBookings: Booking[];
  role: Role;
}) {
  const isAdmin = role === "ADMIN";
  const [bookings, setBookings] = useState(initialBookings);
  const [filter, setFilter] = useState<FilterKey>("today");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const counts = useMemo(() => {
    const now = new Date();
    let today = 0;
    let week = 0;
    for (const b of bookings) {
      const d = new Date(b.date);
      if (isToday(d)) today++;
      if (isSameWeek(d, now, { weekStartsOn: 1 })) week++;
    }
    return { today, week, all: bookings.length };
  }, [bookings]);

  const shown = useMemo(() => {
    const now = new Date();
    const list = bookings.filter((b) => {
      const d = new Date(b.date);
      if (filter === "today") return isToday(d);
      if (filter === "week") return isSameWeek(d, now, { weekStartsOn: 1 });
      return true;
    });
    // Cronológico ascendente: lo próximo primero.
    return [...list].sort((a, b) => {
      const da = startOfDay(new Date(a.date)).getTime();
      const db = startOfDay(new Date(b.date)).getTime();
      if (da !== db) return da - db;
      return a.startTime.localeCompare(b.startTime);
    });
  }, [bookings, filter]);

  async function setWork(id: string, workStatus: string) {
    setBusy(id);
    const res = await updateWorkStatus(id, workStatus);
    if (res.success) {
      setBookings((p) => p.map((b) => (b.id === id ? { ...b, workStatus } : b)));
    } else {
      alert(res.error);
    }
    setBusy(null);
  }

  async function saveAdmin(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setBusy(id);
    const fd = new FormData(e.currentTarget);
    const res = await updateBookingStatus(id, fd);
    if (res.success) {
      setBookings((p) =>
        p.map((b) =>
          b.id === id
            ? {
                ...b,
                status: String(fd.get("status")),
                paymentStatus: String(fd.get("paymentStatus")),
                date: fd.get("newDate")
                  ? new Date(String(fd.get("newDate"))).toISOString()
                  : b.date,
                startTime: fd.get("newTime") ? String(fd.get("newTime")) : b.startTime,
              }
            : b
        )
      );
      setEditing(null);
    } else {
      alert(res.error);
    }
    setBusy(null);
  }

  return (
    <div>
      {/* Filtro segmentado — pegajoso bajo el header */}
      <div className="sticky top-[calc(3.5rem_+_env(safe-area-inset-top))] md:top-14 z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-2.5 bg-brand-pure/85 backdrop-blur-md">
        <div className="flex gap-1 p-1 bg-white/5 rounded-full">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const n = counts[f.key];
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                  active ? "bg-brand-cyan text-brand-pure" : "text-gray-400"
                }`}
              >
                {f.label}
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    active ? "bg-black/20" : "bg-white/10"
                  }`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-20 text-gray-500 text-sm">
          {filter === "today"
            ? "No hay reservas para hoy."
            : filter === "week"
            ? "No hay reservas esta semana."
            : "No hay reservas registradas."}
        </div>
      ) : (
        <ul className="space-y-3 pt-1">
          {shown.map((b) => {
            const d = new Date(b.date);
            const total = b.services.reduce((a, s) => a + s.duration, 0);
            const pill = statusPill(b.status);
            const open = editing === b.id;
            return (
              <li
                key={b.id}
                className="bg-brand-surface border border-white/8 rounded-2xl overflow-hidden"
              >
                <div className="p-4">
                  {/* Fila 1: hora + estado */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-white tabular-nums">
                        {b.startTime}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(d, "EEE d MMM", { locale: es })} · {Math.round((total / 60) * 10) / 10}h
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {b.arrived && (
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border bg-brand-cyan/10 text-brand-cyan border-brand-cyan/25">
                          En taller
                        </span>
                      )}
                      {isAdmin && (
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border ${pill.cls}`}
                        >
                          {pill.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cliente + vehículo */}
                  <div className="mb-1">
                    <span className="font-semibold text-white">{b.customerName}</span>
                    <span className="text-gray-500"> · {b.vehicleMake} {b.vehicleModel}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    {b.services.map((s) => s.name).join(" + ")}
                  </p>

                  {/* Acciones rápidas: llamar + (admin) editar */}
                  <div className="flex gap-2 mb-3">
                    <a
                      href={`tel:${b.customerPhone}`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-brand-cyan bg-brand-cyan/10 px-3 py-1.5 rounded-full"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      Llamar
                    </a>
                    {isAdmin && (
                      <button
                        onClick={() => setEditing(open ? null : b.id)}
                        className="text-xs font-semibold text-gray-300 bg-white/5 px-3 py-1.5 rounded-full"
                      >
                        {open ? "Cerrar" : "Editar reserva"}
                      </button>
                    )}
                  </div>

                  {/* Avance del trabajo — control grande */}
                  <div>
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${workAccent(b.workStatus)}`}>
                      Avance
                    </span>
                    <div className="mt-1 flex gap-1 p-1 bg-black/40 rounded-xl">
                      {WORK_STEPS.map((s) => {
                        const active = b.workStatus === s.value;
                        return (
                          <button
                            key={s.value}
                            disabled={busy === b.id}
                            onClick={() => setWork(b.id, s.value)}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                              active
                                ? s.value === "DONE"
                                  ? "bg-green-500 text-black"
                                  : s.value === "IN_PROGRESS"
                                  ? "bg-amber-500 text-black"
                                  : "bg-white/15 text-white"
                                : "text-gray-500"
                            }`}
                          >
                            {s.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Panel admin */}
                {isAdmin && open && (
                  <form
                    onSubmit={(e) => saveAdmin(e, b.id)}
                    className="border-t border-white/8 bg-black/30 p-4 grid grid-cols-2 gap-3"
                  >
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 col-span-2 -mb-1">
                      Estado y pago
                    </label>
                    <select
                      name="status"
                      defaultValue={b.status}
                      className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white"
                    >
                      <option value="PENDING">Pendiente</option>
                      <option value="CONFIRMED">Confirmada</option>
                      <option value="CANCELLED">Cancelada</option>
                    </select>
                    <select
                      name="paymentStatus"
                      defaultValue={b.paymentStatus}
                      className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white"
                    >
                      <option value="PENDING">Pago pendiente</option>
                      <option value="PAID_RESERVATION">Abono pagado</option>
                      <option value="PAID_FULL">Pago completo</option>
                      <option value="REFUNDED">Reembolsado</option>
                    </select>
                    <label className="text-[10px] uppercase tracking-widest text-gray-500 col-span-2 -mb-1 mt-1">
                      Reagendar (opcional)
                    </label>
                    <input
                      type="date"
                      name="newDate"
                      defaultValue={format(d, "yyyy-MM-dd")}
                      className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white"
                    />
                    <input
                      type="time"
                      name="newTime"
                      defaultValue={b.startTime}
                      className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white"
                    />
                    <button
                      type="submit"
                      disabled={busy === b.id}
                      className="col-span-2 mt-1 bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs py-3 rounded-xl disabled:opacity-50"
                    >
                      {busy === b.id ? "Guardando…" : "Guardar cambios"}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

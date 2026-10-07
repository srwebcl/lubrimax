"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { updateWorkStatus } from "@/actions/admin-bookings";
import {
  deliverVehicle,
  markNoShow,
  registerPayment,
  updateEvaluatedPrices,
  type BoardCard,
  type BoardData,
  type BoardStage,
} from "@/actions/workshop";
import { LOCAL_PAYMENT_METHODS, PAYMENT_METHODS } from "@/lib/booking-money";
import { formatPlate } from "@/lib/plate";
import { INPUT, LABEL, Msg, PrimaryBtn, Sheet } from "@/components/admin/kit";

const REFRESH_MS = 20_000;

const COLUMNS: { stage: Exclude<BoardStage, "DELIVERED">; title: string; hint: string; accent: string }[] = [
  { stage: "ARRIVING", title: "Por llegar", hint: "Reservas web de hoy", accent: "text-sky-400" },
  { stage: "WAITING", title: "En espera", hint: "En el local, sin iniciar", accent: "text-amber-400" },
  { stage: "IN_PROGRESS", title: "En proceso", hint: "Trabajando", accent: "text-brand-cyan" },
  { stage: "READY", title: "Listo para retirar", hint: "Esperando al cliente", accent: "text-green-400" },
];

const clp = (n: number) => `$${n.toLocaleString("es-CL")}`;
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "America/Santiago" });

export type BoardAllowed = {
  intake: boolean;
  work: boolean;
  deliver: boolean;
  charge: boolean;
  pricing: boolean;
  noshow: boolean;
};

export default function WorkshopBoard({ board, allowed }: { board: BoardData; allowed: BoardAllowed }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<BoardCard | null>(null);
  const [pricing, setPricing] = useState<BoardCard | null>(null);
  const [charging, setCharging] = useState<BoardCard | null>(null);
  const [showDelivered, setShowDelivered] = useState(false);

  // Refresco automático: puede haber otro teléfono moviendo tarjetas.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  async function run(key: string, action: () => Promise<{ success: boolean; error?: string }>) {
    setBusy(key);
    const res = await action();
    setBusy(null);
    if (!res.success) alert(res.error ?? "No se pudo completar la acción.");
    else startTransition(() => router.refresh());
  }

  const byStage = (s: BoardStage) => board.cards.filter((c) => c.stage === s);
  const delivered = byStage("DELIVERED");
  const { capacity } = board;
  const [y, m, d] = board.today.split("-");

  return (
    <div className="space-y-4">
      {/* ── Cabecera + capacidad ── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-bold tracking-tight text-white">
            Taller <span className="text-gray-500 font-medium text-base">· {d}/{m}/{y}</span>
          </h1>
          <p className="text-sm text-gray-500">Todos los vehículos del día, con o sin reserva.</p>
        </div>
        {allowed.intake && (
          <Link
            href="/admin/ingreso"
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-brand-cyan text-black text-sm font-extrabold shadow-[0_0_15px_rgba(0,255,255,0.15)]"
          >
            <span className="text-lg leading-none">+</span> Nuevo ingreso
          </Link>
        )}
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Puestos en uso" value={`${capacity.inProgress}/${capacity.bays}`} warn={capacity.inProgress >= capacity.bays} />
        <Stat label="En espera" value={String(capacity.waiting)} warn={capacity.waiting > 0 && capacity.inProgress >= capacity.bays} />
        <Stat label="Próxima hora" value={capacity.nextFreeSlot ?? "Sin cupo hoy"} warn={!capacity.nextFreeSlot} />
      </div>

      {/* ── Columnas (apiladas en móvil) ── */}
      <div className={`grid grid-cols-1 lg:grid-cols-4 gap-4 transition-opacity ${pending ? "opacity-80" : ""}`}>
        {COLUMNS.map((col) => {
          const cards = byStage(col.stage);
          return (
            <section key={col.stage} className="min-w-0">
              <div className="flex items-baseline justify-between mb-2 px-1">
                <h2 className={`text-xs font-bold uppercase tracking-widest ${col.accent}`}>
                  {col.title} <span className="text-gray-500 ml-1">{cards.length}</span>
                </h2>
                <span className="text-[10px] text-gray-600 hidden lg:inline">{col.hint}</span>
              </div>
              {cards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/8 p-4 text-center text-xs text-gray-600">
                  Nada por aquí
                </div>
              ) : (
                <ul className="space-y-2">
                  {cards.map((c) => (
                    <li key={c.key}>
                      <Card
                        card={c}
                        allowed={allowed}
                        busy={busy === c.key}
                        onStart={() => c.bookingId && run(c.key, () => updateWorkStatus(c.bookingId!, "IN_PROGRESS"))}
                        onFinish={() => {
                          if (!c.bookingId) return;
                          if (!confirm("¿Marcar como terminado? Se avisará al cliente por correo si tiene uno.")) return;
                          run(c.key, () => updateWorkStatus(c.bookingId!, "DONE"));
                        }}
                        onNoShow={() => {
                          if (!c.bookingId) return;
                          if (!confirm(`¿${c.customerName} no se presentó? Se liberará su horario.`)) return;
                          run(c.key, () => markNoShow(c.bookingId!));
                        }}
                        onDeliver={() => setDelivering(c)}
                        onPrice={() => setPricing(c)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* ── Entregados hoy ── */}
      {delivered.length > 0 && (
        <section className="pt-2">
          <button
            onClick={() => setShowDelivered((v) => !v)}
            className="text-xs font-bold uppercase tracking-widest text-gray-400"
          >
            {showDelivered ? "▾" : "▸"} Entregados hoy <span className="text-gray-600 ml-1">{delivered.length}</span>
          </button>
          {showDelivered && (
            <ul className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
              {delivered.map((c) => (
                <li key={c.key} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 flex items-center gap-3 text-sm">
                  <span className="font-mono font-bold text-white">{c.plate ? formatPlate(c.plate) : "—"}</span>
                  <span className="text-gray-400 truncate flex-1">{c.customerName}</span>
                  {c.money && c.money.balance > 0 && (
                    <span className="text-[11px] font-bold text-red-400">Saldo {clp(c.money.balance)}</span>
                  )}
                  {c.money && c.money.balance > 0 && c.bookingId && allowed.charge && (
                    <button
                      onClick={() => setCharging(c)}
                      className="text-[11px] font-bold px-2 py-1 rounded-lg bg-green-500/15 text-green-400 border border-green-500/25"
                    >
                      Cobrar
                    </button>
                  )}
                  {c.deliveredAt && <span className="text-xs text-gray-500">{hhmm(c.deliveredAt)}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <DeliverSheet
        card={delivering}
        canCharge={allowed.charge}
        canPrice={allowed.pricing}
        onClose={() => setDelivering(null)}
        onDone={() => {
          setDelivering(null);
          startTransition(() => router.refresh());
        }}
        onAdjustPrice={(c) => {
          setDelivering(null);
          setPricing(c);
        }}
      />

      <ChargeSheet
        card={charging}
        onClose={() => setCharging(null)}
        onDone={() => {
          setCharging(null);
          startTransition(() => router.refresh());
        }}
      />

      <PriceSheet
        card={pricing}
        onClose={() => setPricing(null)}
        onDone={() => {
          setPricing(null);
          startTransition(() => router.refresh());
        }}
      />
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${warn ? "border-amber-500/25 bg-amber-500/5" : "border-white/8 bg-brand-surface"}`}>
      <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">{label}</div>
      <div className={`text-lg font-black ${warn ? "text-amber-400" : "text-white"}`}>{value}</div>
    </div>
  );
}

function Card({
  card: c,
  busy,
  onStart,
  onFinish,
  onNoShow,
  onDeliver,
  onPrice,
  allowed,
}: {
  card: BoardCard;
  allowed: BoardAllowed;
  busy: boolean;
  onStart: () => void;
  onFinish: () => void;
  onNoShow: () => void;
  onDeliver: () => void;
  onPrice: () => void;
}) {
  const btn = "flex-1 h-10 rounded-xl text-xs font-extrabold uppercase tracking-wider disabled:opacity-50";
  const pendingPrices = c.pricing.filter((i) => i.price === null).length;
  const canPrice = allowed.pricing && c.pricing.length > 0 && c.stage !== "ARRIVING" && c.stage !== "DELIVERED";

  return (
    <div className={`rounded-2xl border bg-brand-surface p-3 space-y-2.5 ${c.late ? "border-red-500/40" : "border-white/8"}`}>
      <div className="flex items-start gap-3">
        {c.photoUrl ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
            <Image src={c.photoUrl} alt="" fill className="object-cover" />
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
          {/* Estado de pago bien visible: en la recepción no puede haber dudas. */}
          {c.money && c.money.total > 0 && (
            <div
              className={`mb-1.5 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md ${
                c.money.balance === 0
                  ? "bg-green-500/15 text-green-400 border border-green-500/30"
                  : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
              }`}
            >
              {c.money.balance === 0
                ? `✓ Pagada${c.source === "WEB" ? " online" : ""}`
                : `Por cobrar ${clp(c.money.balance)}`}
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono font-black text-white tracking-wider">{c.plate ? formatPlate(c.plate) : "Sin patente"}</span>
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                c.source === "WEB" ? "bg-purple-500/20 text-purple-300" : "bg-white/10 text-gray-300"
              }`}
            >
              {c.source === "WEB" ? "WEB" : "LOCAL"}
            </span>
            {c.late && <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">ATRASADO</span>}
            {pendingPrices > 0 && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">POR EVALUAR</span>
            )}
          </div>
          <div className="text-xs text-gray-400 truncate">{c.vehicle}</div>
          <div className="text-xs text-gray-300 truncate">{c.customerName}</div>
        </div>
        <div className="text-right shrink-0">
          {c.startTime && c.stage === "ARRIVING" && <div className="text-sm font-black text-white">{c.startTime}</div>}
          {c.arrivedAt && c.stage !== "ARRIVING" && <div className="text-[11px] text-gray-500">llegó {hhmm(c.arrivedAt)}</div>}

        </div>
      </div>

      {c.services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {c.services.map((s, i) => (
            <span key={i} className="text-[10px] font-semibold bg-white/5 border border-white/8 text-gray-300 px-2 py-0.5 rounded-md">
              {s}
            </span>
          ))}
        </div>
      )}
      {c.notes && <p className="text-[11px] text-gray-500 italic line-clamp-2">“{c.notes}”</p>}

      <div className="flex gap-2">
        {canPrice && (
          <button
            onClick={onPrice}
            className={`h-10 shrink-0 px-3 rounded-xl border text-[11px] font-bold ${
              pendingPrices > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-white/5 border-white/10 text-gray-300"
            }`}
          >
            $ Precio
          </button>
        )}
        {c.customerPhone && (
          <a
            href={`tel:${c.customerPhone.replace(/\s/g, "")}`}
            className="w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300"
            aria-label="Llamar al cliente"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </a>
        )}

        {c.stage === "ARRIVING" && c.bookingId && (
          <>
            {allowed.intake && (
              <Link href={`/admin/ingreso?reserva=${c.bookingId}`} className={`${btn} bg-sky-500 text-black inline-flex items-center justify-center`}>
                Llegó
              </Link>
            )}
            {allowed.noshow && (
              <button onClick={onNoShow} disabled={busy} className={`${btn} flex-none px-3 bg-white/5 text-gray-400 border border-white/10`}>
                No vino
              </button>
            )}
          </>
        )}
        {c.stage === "WAITING" && allowed.work && (
          <button onClick={onStart} disabled={busy} className={`${btn} bg-amber-400 text-black`}>
            {busy ? "…" : "Iniciar"}
          </button>
        )}
        {c.stage === "IN_PROGRESS" &&
          (c.bookingId ? (
            allowed.work && 
            <button onClick={onFinish} disabled={busy} className={`${btn} bg-brand-cyan text-black`}>
              {busy ? "…" : "Terminar"}
            </button>
          ) : (
            allowed.deliver && (
              <button onClick={onDeliver} disabled={busy} className={`${btn} bg-green-500 text-black`}>
                Entregar
              </button>
            )
          ))}
        {c.stage === "READY" && allowed.deliver && (
          <button onClick={onDeliver} disabled={busy} className={`${btn} bg-green-500 text-black`}>
            {c.money && c.money.balance > 0 && allowed.charge ? "Cobrar y entregar" : "Entregar"}
          </button>
        )}
      </div>
    </div>
  );
}

function DeliverSheet({
  card,
  canCharge,
  canPrice,
  onClose,
  onDone,
  onAdjustPrice,
}: {
  card: BoardCard | null;
  canCharge: boolean;
  canPrice: boolean;
  onClose: () => void;
  onDone: () => void;
  onAdjustPrice: (card: BoardCard) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof LOCAL_PAYMENT_METHODS)[number]>("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owed = card?.money?.balance ?? 0;
  // Sin permiso de cobro: se puede entregar, pero el saldo queda pendiente.
  const balance = canCharge ? owed : 0;

  // Al abrir con otra tarjeta, proponer cobrar el saldo completo.
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (card && card.key !== lastKey) {
    setLastKey(card.key);
    setAmount(balance > 0 ? String(balance) : "");
    setMethod("CASH");
    setError(null);
  }

  async function submit(withPayment: boolean) {
    if (!card?.intakeId) return;
    const value = Number(amount);
    if (withPayment && (!Number.isInteger(value) || value <= 0)) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (!withPayment && balance > 0 && !confirm(`Queda un saldo de ${clp(balance)} sin cobrar. ¿Entregar igual?`)) return;

    setSaving(true);
    setError(null);
    const res = await deliverVehicle({
      intakeId: card.intakeId,
      payment: withPayment ? { amount: value, method } : undefined,
    });
    setSaving(false);
    if (res.success) onDone();
    else setError(res.error);
  }

  return (
    <Sheet open={!!card} onClose={onClose} title={card ? `Entregar ${card.plate ? formatPlate(card.plate) : ""}` : ""}>
      {card && (
        <div className="space-y-4">
          <div className="text-sm text-gray-300">
            {card.customerName} · <span className="text-gray-500">{card.vehicle}</span>
          </div>

          {card.pricing.some((i) => i.price === null) && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-center justify-between gap-3">
              <span>Hay servicios por evaluar sin precio: el total está incompleto.</span>
              {canPrice && (
                <button onClick={() => onAdjustPrice(card)} className="shrink-0 font-bold underline">
                  Ajustar precio
                </button>
              )}
            </div>
          )}

          {card.money ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/[0.03] border border-white/8 p-2">
                <div className="text-[10px] uppercase tracking-widest text-gray-500">Total</div>
                <div className="font-black text-white">{clp(card.money.total)}</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/8 p-2">
                <div className="text-[10px] uppercase tracking-widest text-gray-500">Pagado</div>
                <div className="font-black text-green-400">{clp(card.money.paid)}</div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/8 p-2">
                <div className="text-[10px] uppercase tracking-widest text-gray-500">Saldo</div>
                <div className={`font-black ${owed > 0 ? "text-amber-400" : "text-white"}`}>{clp(owed)}</div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">Ingreso sin reserva asociada: no hay monto que cobrar desde aquí.</p>
          )}

          {!canCharge && owed > 0 && (
            <p className="text-xs text-amber-300">
              Queda un saldo de {clp(owed)}. No tienes habilitado registrar cobros: lo registra el administrador.
            </p>
          )}

          {balance > 0 && (
            <div className="space-y-3">
              <div>
                <label className={LABEL}>Medio de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {LOCAL_PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`h-11 rounded-xl text-xs font-bold border ${
                        method === m ? "bg-brand-cyan text-black border-brand-cyan" : "bg-white/5 text-gray-300 border-white/10"
                      }`}
                    >
                      {PAYMENT_METHODS[m]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={LABEL}>Monto cobrado</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={balance}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
          )}

          {error && <Msg kind="err">{error}</Msg>}

          {balance > 0 ? (
            <div className="space-y-2">
              <PrimaryBtn onClick={() => submit(true)} disabled={saving} className="w-full">
                {saving ? "Guardando…" : "Registrar cobro y entregar"}
              </PrimaryBtn>
              <button onClick={() => submit(false)} disabled={saving} className="w-full text-xs text-gray-500 py-2">
                Entregar sin cobrar
              </button>
            </div>
          ) : (
            <PrimaryBtn onClick={() => submit(false)} disabled={saving} className="w-full">
              {saving ? "Guardando…" : "Confirmar entrega"}
            </PrimaryBtn>
          )}
        </div>
      )}
    </Sheet>
  );
}

function PriceSheet({ card, onClose, onDone }: { card: BoardCard | null; onClose: () => void; onDone: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir con otra tarjeta, cargar los precios actuales.
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (card && card.key !== lastKey) {
    setLastKey(card.key);
    setValues(Object.fromEntries(card.pricing.map((i) => [i.key, i.price === null ? "" : String(i.price)])));
    setError(null);
  }

  const catalog = card?.money ? card.money.total - card.pricing.reduce((s, i) => s + (i.price ?? 0), 0) : 0;
  const preview = catalog + Object.values(values).reduce((s, v) => s + (Number(v) || 0), 0);

  async function save() {
    if (!card?.bookingId) return;
    const prices: Record<string, number | null> = {};
    for (const [key, v] of Object.entries(values)) {
      if (v.trim() === "") prices[key] = null;
      else if (!Number.isInteger(Number(v)) || Number(v) < 0) return setError("Ingresa montos enteros, sin puntos.");
      else prices[key] = Number(v);
    }
    setSaving(true);
    setError(null);
    const res = await updateEvaluatedPrices({ bookingId: card.bookingId, prices });
    setSaving(false);
    if (res.success) onDone();
    else setError(res.error);
  }

  return (
    <Sheet open={!!card} onClose={onClose} title={card ? `Precio ${card.plate ? formatPlate(card.plate) : ""}` : ""}>
      {card && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Servicios cuyo precio depende de la evaluación. Déjalo vacío si aún no está evaluado.
          </p>
          {card.pricing.map((i) => (
            <div key={i.key}>
              <label className={LABEL}>{i.name}</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={values[i.key] ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, [i.key]: e.target.value }))}
                placeholder="Por evaluar"
                className={INPUT}
              />
            </div>
          ))}
          <div className="flex justify-between items-center text-sm border-t border-white/10 pt-3">
            <span className="text-gray-400 uppercase text-xs tracking-widest">Nuevo total</span>
            <span className="text-white font-black">{clp(preview)}</span>
          </div>
          {error && <Msg kind="err">{error}</Msg>}
          <PrimaryBtn onClick={save} disabled={saving} className="w-full">
            {saving ? "Guardando…" : "Guardar precio"}
          </PrimaryBtn>
        </div>
      )}
    </Sheet>
  );
}

/** Cobro de un saldo pendiente después de la entrega. */
function ChargeSheet({ card, onClose, onDone }: { card: BoardCard | null; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof LOCAL_PAYMENT_METHODS)[number]>("CASH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const balance = card?.money?.balance ?? 0;

  const [lastKey, setLastKey] = useState<string | null>(null);
  if (card && card.key !== lastKey) {
    setLastKey(card.key);
    setAmount(String(balance));
    setMethod("CASH");
    setError(null);
  }

  async function save() {
    if (!card?.bookingId) return;
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) return setError("Ingresa un monto válido.");
    setSaving(true);
    setError(null);
    const res = await registerPayment({ bookingId: card.bookingId, amount: value, method });
    setSaving(false);
    if (res.success) onDone();
    else setError(res.error);
  }

  return (
    <Sheet open={!!card} onClose={onClose} title={card ? `Cobrar ${card.plate ? formatPlate(card.plate) : ""}` : ""}>
      {card && (
        <div className="space-y-4">
          <div className="text-sm text-gray-300">
            {card.customerName} · saldo pendiente <span className="font-bold text-amber-400">{clp(balance)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LOCAL_PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`h-11 rounded-xl text-xs font-bold border ${
                  method === m ? "bg-brand-cyan text-black border-brand-cyan" : "bg-white/5 text-gray-300 border-white/10"
                }`}
              >
                {PAYMENT_METHODS[m]}
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={balance}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={INPUT}
          />
          {error && <Msg kind="err">{error}</Msg>}
          <PrimaryBtn onClick={save} disabled={saving} className="w-full">
            {saving ? "Guardando…" : "Registrar cobro"}
          </PrimaryBtn>
        </div>
      )}
    </Sheet>
  );
}

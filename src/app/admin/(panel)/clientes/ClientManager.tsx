"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPlate } from "@/lib/plate";
import { formatPhone, formatRut, titleCase } from "@/lib/contact";
import { deleteClient, getClientDeletionImpact } from "@/actions/admin-clients";
import { Screen, PageHead, Empty, Sheet, Msg } from "@/components/admin/kit";

export type UnifiedClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  rut: string | null;
  source: "Taller" | "Web";
  vehicles: { plate: string; make: string; model: string }[];
  date: Date;
};

const PAGE_SIZE = 20;

const SORTS = {
  recent: { label: "Más recientes", fn: (a: UnifiedClient, b: UnifiedClient) => b.date.getTime() - a.date.getTime() },
  oldest: { label: "Más antiguos", fn: (a: UnifiedClient, b: UnifiedClient) => a.date.getTime() - b.date.getTime() },
  nameAsc: { label: "Nombre A → Z", fn: (a: UnifiedClient, b: UnifiedClient) => a.name.localeCompare(b.name, "es") },
  nameDesc: { label: "Nombre Z → A", fn: (a: UnifiedClient, b: UnifiedClient) => b.name.localeCompare(a.name, "es") },
  vehicles: {
    label: "Más vehículos",
    fn: (a: UnifiedClient, b: UnifiedClient) => b.vehicles.length - a.vehicles.length || a.name.localeCompare(b.name, "es"),
  },
} as const;
type SortKey = keyof typeof SORTS;

type SourceFilter = "all" | "Taller" | "Web";

/** Minúsculas y sin tildes, para buscar "perez" = "Pérez". */
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const selectCls =
  "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-cyan";

export default function ClientManager({
  initialClients,
  canDelete,
}: {
  initialClients: UnifiedClient[];
  /** Solo el administrador puede borrar (irreversible). */
  canDelete: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [source, setSource] = useState<SourceFilter>("all");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<UnifiedClient | null>(null);

  const filtered = useMemo(() => {
    const q = fold(searchTerm.trim());
    const qDigits = searchTerm.replace(/[^0-9kK]/g, "").toLowerCase();
    return initialClients
      .filter((c) => source === "all" || c.source === source)
      .filter((c) => {
        if (!q) return true;
        return (
          fold(c.name).includes(q) ||
          (!!qDigits && !!c.rut && c.rut.replace(/[^0-9kK]/g, "").toLowerCase().includes(qDigits)) ||
          (!!qDigits && !!c.phone && c.phone.replace(/\D/g, "").includes(qDigits)) ||
          (!!c.email && c.email.toLowerCase().includes(q)) ||
          c.vehicles.some((v) => fold(`${v.plate} ${v.make} ${v.model}`).includes(q))
        );
      })
      .sort(SORTS[sort].fn);
  }, [initialClients, searchTerm, sort, source]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Cualquier cambio de búsqueda/orden/filtro vuelve a la primera página.
  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <Screen size="xl">
      <PageHead
        title="Directorio de Clientes"
        subtitle="Listado unificado de clientes registrados en el taller y por reservas web."
      />

      {/* Búsqueda, orden y filtro */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Buscar cliente, patente, teléfono, RUT…"
            value={searchTerm}
            onChange={(e) => resetPage(setSearchTerm)(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-cyan transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => resetPage(setSort)(e.target.value as SortKey)}
            className={`${selectCls} flex-1 sm:flex-none`}
            aria-label="Ordenar"
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={source}
            onChange={(e) => resetPage(setSource)(e.target.value as SourceFilter)}
            className={`${selectCls} flex-1 sm:flex-none`}
            aria-label="Origen"
          >
            <option value="all">Todos</option>
            <option value="Taller">Del taller</option>
            <option value="Web">Reserva web</option>
          </select>
        </div>
      </div>

      {initialClients.length === 0 ? (
        <Empty>Aún no hay clientes registrados en el sistema.</Empty>
      ) : filtered.length === 0 ? (
        <Empty>No se encontraron clientes que coincidan con la búsqueda.</Empty>
      ) : (
        <>
          {/* Escritorio: listado tipo tabla */}
          <div className="hidden md:block rounded-2xl border border-white/8 overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="py-3 pl-4 pr-3 font-semibold">Cliente</th>
                  <th className="py-3 px-3 font-semibold">Contacto</th>
                  <th className="py-3 px-3 font-semibold">Vehículos</th>
                  <th className="py-3 pl-3 pr-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {shown.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="py-4 pl-4 pr-3 align-middle">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-base whitespace-nowrap">{titleCase(c.name)}</span>
                        <SourceBadge source={c.source} />
                        {c.rut && <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-md whitespace-nowrap">{formatRut(c.rut)}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-3 align-middle text-gray-400 text-sm">
                      <div className="flex flex-col gap-0.5">
                        {c.phone && <span className="text-white whitespace-nowrap">{formatPhone(c.phone)}</span>}
                        {c.email && <span className="text-xs truncate max-w-[220px]" title={c.email}>{c.email}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-3 align-middle">
                      <Vehicles vehicles={c.vehicles} />
                    </td>
                    <td className="py-4 pl-3 pr-4 align-middle text-right whitespace-nowrap">
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        className="inline-block text-xs font-bold px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-cyan hover:bg-brand-cyan hover:text-black hover:border-brand-cyan transition-all"
                      >
                        Ver Perfil
                      </Link>
                      {canDelete && (
                        <button
                          onClick={() => setDeleting(c)}
                          className="ml-2 text-xs font-bold px-3 py-2 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Borrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="md:hidden space-y-3">
            {shown.map((c) => (
              <li key={c.id} className="bg-brand-surface border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-bold text-white text-lg">{titleCase(c.name)}</div>
                    {c.rut && <div className="text-xs text-gray-500">RUT: {formatRut(c.rut)}</div>}
                  </div>
                  <SourceBadge source={c.source} />
                </div>

                <div className="text-sm text-gray-400 space-y-0.5">
                  {c.phone && <div>{formatPhone(c.phone)}</div>}
                  {c.email && <div>{c.email}</div>}
                </div>

                <div className="pt-2 border-t border-white/5">
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5">Vehículos</div>
                  <div className="mb-3">
                    <Vehicles vehicles={c.vehicles} />
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="flex-1 inline-block text-center text-xs font-bold px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-brand-cyan"
                    >
                      Abrir Perfil
                    </Link>
                    {canDelete && (
                      <button
                        onClick={() => setDeleting(c)}
                        className="text-xs font-bold px-4 py-2.5 rounded-lg border border-red-500/25 text-red-400"
                      >
                        Borrar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Paginación */}
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span className="text-gray-500 text-xs">
              {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} de {filtered.length} clientes
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(current - 1)}
                  disabled={current === 1}
                  className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-gray-300 font-semibold disabled:opacity-30"
                >
                  ← Anterior
                </button>
                <span className="text-gray-400 text-xs whitespace-nowrap">
                  Página {current} de {pageCount}
                </span>
                <button
                  onClick={() => setPage(current + 1)}
                  disabled={current === pageCount}
                  className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-gray-300 font-semibold disabled:opacity-30"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {canDelete && <DeleteSheet client={deleting} onClose={() => setDeleting(null)} />}
    </Screen>
  );
}

function SourceBadge({ source }: { source: "Taller" | "Web" }) {
  return (
    <span
      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
        source === "Web" ? "bg-purple-500/20 text-purple-300" : "bg-white/10 text-gray-300"
      }`}
    >
      {source === "Web" ? "WEB" : "TALLER"}
    </span>
  );
}

function Vehicles({ vehicles }: { vehicles: UnifiedClient["vehicles"] }) {
  if (vehicles.length === 0) return <span className="text-xs text-gray-600">Sin vehículos</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {vehicles.map((v, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-xs">
          {v.plate && <span className="text-white font-mono font-bold uppercase">{formatPlate(v.plate)}</span>}
          <span className="text-gray-400">
            {v.make} {v.model}
          </span>
        </span>
      ))}
    </div>
  );
}

type Impact = { vehicles: number; visits: number; bookings: number; upcoming: { day: string; time: string } | null };

/** Confirmación de borrado: muestra exactamente qué se elimina. */
function DeleteSheet({ client, onClose }: { client: UnifiedClient | null; onClose: () => void }) {
  const router = useRouter();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, startDelete] = useTransition();

  // Al abrir con otro cliente: cargar el impacto del borrado.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (client && client.id !== loadedFor) {
    setLoadedFor(client.id);
    setImpact(null);
    setError(null);
    setConfirmText("");
    getClientDeletionImpact(client.id).then((res) => {
      if (res.success) setImpact(res);
      else setError(res.error);
    });
  }

  const blocked = !!impact?.upcoming;
  const ready = !!impact && !blocked && confirmText.trim().toUpperCase() === "BORRAR";

  function confirm() {
    if (!client) return;
    startDelete(async () => {
      const res = await deleteClient(client.id);
      if (res.success) {
        onClose();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const fmtDay = (day: string) => day.split("-").reverse().join("/");

  return (
    <Sheet open={!!client} onClose={onClose} title={client ? `Borrar a ${titleCase(client.name)}` : ""}>
      {client && (
        <div className="space-y-4">
          {!impact && !error && <p className="text-sm text-gray-400">Revisando qué se eliminaría…</p>}

          {impact && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Vehículos", impact.vehicles],
                  ["Visitas al taller", impact.visits],
                  ["Reservas", impact.bookings],
                ].map(([label, n]) => (
                  <div key={label as string} className="rounded-xl bg-white/[0.03] border border-white/8 p-2">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500">{label}</div>
                    <div className="text-xl font-black text-white">{n}</div>
                  </div>
                ))}
              </div>

              {blocked ? (
                <Msg kind="err">
                  Tiene una reserva próxima ({fmtDay(impact.upcoming!.day)} {impact.upcoming!.time}). Cancélala primero
                  desde la Agenda para poder borrarlo.
                </Msg>
              ) : (
                <>
                  <p className="text-sm text-red-300">
                    Se borrará el cliente con <strong>todo su historial</strong> (vehículos, visitas, reservas y pagos
                    registrados). <strong>No se puede deshacer.</strong>
                  </p>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
                      Escribe BORRAR para confirmar
                    </label>
                    <input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      autoCapitalize="characters"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3 text-[15px] text-white focus:border-red-400 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </>
          )}

          {error && <Msg kind="err">{error}</Msg>}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-white/10 bg-white/5 text-gray-300 text-sm font-bold"
            >
              Cancelar
            </button>
            {!blocked && (
              <button
                onClick={confirm}
                disabled={!ready || deleting}
                className="flex-1 h-12 rounded-xl bg-red-500 text-white text-sm font-extrabold disabled:opacity-40"
              >
                {deleting ? "Borrando…" : "Borrar definitivamente"}
              </button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}

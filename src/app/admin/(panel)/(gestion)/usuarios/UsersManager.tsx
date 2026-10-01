"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStaffUser,
  updateStaffUser,
  resetStaffPassword,
  forceLogoutStaff,
  deleteStaffUser,
  updateStaffPermissions,
} from "@/actions/admin-staff";
import { WORKER_PERMISSIONS, normalizePermissions } from "@/lib/permissions";
import { AddBtn, Sheet, Field, INPUT as KIT_INPUT, Msg, CARD } from "@/components/admin/kit";

type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "WORKER";
  isActive: boolean;
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
};

const inputCls = KIT_INPUT;

export default function UsersManager({
  initialUsers,
  currentUserId,
}: {
  initialUsers: StaffUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [permsFor, setPermsFor] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function run(action: () => Promise<{ success: boolean; error?: string }>, okText: string) {
    setMsg(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setMsg({ type: "ok", text: okText });
        setEditing(null);
        setResetting(null);
        setPermsFor(null);
        setShowCreate(false);
        router.refresh();
      } else {
        setMsg({ type: "err", text: result.error || "Error." });
      }
    });
  }

  return (
    <div className="space-y-4">
      {msg && <Msg kind={msg.type}>{msg.text}</Msg>}

      <div className="flex justify-end">
        <AddBtn label="Usuario" onClick={() => { setMsg(null); setShowCreate(true); }} />
      </div>

      <Sheet open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo usuario">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => createStaffUser(fd), "Usuario creado.");
          }}
          className="space-y-4"
        >
          <Field label="Nombre y apellido">
            <input name="name" required placeholder="Juan Pérez" className={KIT_INPUT} />
          </Field>
          <Field label="Correo">
            <input name="email" type="email" required placeholder="correo@lubrimax.cl" className={KIT_INPUT} />
          </Field>
          <Field label="Contraseña temporal" hint="Mínimo 10 caracteres">
            <input name="password" type="password" required minLength={10} autoComplete="new-password" className={KIT_INPUT} />
          </Field>
          <Field label="Rol">
            <select name="role" defaultValue="WORKER" className={KIT_INPUT}>
              <option value="WORKER">Trabajador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </Field>
          <button
            type="submit"
            disabled={pending}
            className="w-full h-11 rounded-xl bg-brand-cyan text-brand-pure text-sm font-bold disabled:opacity-50"
          >
            Crear cuenta
          </button>
        </form>
      </Sheet>

      <div className="space-y-3">
        {initialUsers.map((u) => (
          <div key={u.id} className={CARD}>
            <div className="flex items-start gap-2 flex-wrap">
              <span className="font-bold text-white">{u.name}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  u.role === "ADMIN"
                    ? "bg-brand-cyan/15 text-brand-cyan"
                    : "bg-white/8 text-gray-300"
                }`}
              >
                {u.role === "ADMIN" ? "Admin" : "Trabajador"}
              </span>
              {!u.isActive && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                  Desactivado
                </span>
              )}
              {u.id === currentUserId && (
                <span className="text-[10px] text-gray-500">(tú)</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-mono">{u.email}</div>
            <div className="text-[11px] text-gray-600 mt-0.5">
              Último ingreso: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("es-CL") : "nunca"}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => { setEditing(editing === u.id ? null : u.id); setResetting(null); setPermsFor(null); }}
                className="text-xs font-bold px-3 py-2 rounded-lg border border-brand-cyan/25 text-brand-cyan"
              >
                Editar
              </button>
              {u.role === "WORKER" && (
                <button
                  onClick={() => { setPermsFor(permsFor === u.id ? null : u.id); setEditing(null); setResetting(null); }}
                  className="text-xs font-bold px-3 py-2 rounded-lg border border-brand-cyan/25 text-brand-cyan"
                >
                  Permisos ({u.permissions.length}/{WORKER_PERMISSIONS.length})
                </button>
              )}
              <button
                onClick={() => { setResetting(resetting === u.id ? null : u.id); setEditing(null); setPermsFor(null); }}
                className="text-xs font-bold px-3 py-2 rounded-lg border border-white/12 text-gray-300"
              >
                Resetear clave
              </button>
              <button
                disabled={pending}
                onClick={() => run(() => forceLogoutStaff(u.id), "Sesiones cerradas.")}
                className="text-xs font-bold px-3 py-2 rounded-lg border border-amber-500/25 text-amber-400 disabled:opacity-50"
              >
                Forzar logout
              </button>
              {u.id !== currentUserId && (
                <button
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`¿Eliminar la cuenta de ${u.name}? Es irreversible.`)) {
                      run(() => deleteStaffUser(u.id), "Cuenta eliminada.");
                    }
                  }}
                  className="text-xs font-bold px-3 py-2 rounded-lg border border-red-500/25 text-red-400 disabled:opacity-50"
                >
                  Eliminar
                </button>
              )}
            </div>

            {editing === u.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(() => updateStaffUser(u.id, fd), "Usuario actualizado.");
                }}
                className="mt-4 pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-3"
              >
                <input name="name" required defaultValue={u.name} className={inputCls} />
                <select name="role" defaultValue={u.role} className={inputCls}>
                  <option value="WORKER">Trabajador</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                <select name="isActive" defaultValue={String(u.isActive)} className={inputCls}>
                  <option value="true">Activo</option>
                  <option value="false">Desactivado</option>
                </select>
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={pending}
                    className="bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-6 py-2.5 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                  >
                    Guardar cambios
                  </button>
                </div>
              </form>
            )}

            {permsFor === u.id && (
              <PermissionsForm
                user={u}
                pending={pending}
                onSave={(perms) => run(() => updateStaffPermissions(u.id, perms), "Permisos guardados. Aplican de inmediato.")}
              />
            )}

            {resetting === u.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(() => resetStaffPassword(u.id, fd), "Contraseña reseteada.");
                }}
                className="mt-4 pt-4 border-t border-white/5 flex flex-col md:flex-row gap-3"
              >
                <input
                  name="password"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  placeholder="Nueva contraseña (mín. 10). Se cierran sus sesiones."
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-white/10 text-white font-bold uppercase tracking-widest text-xs px-6 py-2.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  Resetear
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Casillas de funciones habilitadas para un trabajador. */
function PermissionsForm({
  user,
  pending,
  onSave,
}: {
  user: StaffUser;
  pending: boolean;
  onSave: (permissions: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(user.permissions));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        // Sin "ver clientes" no se puede "editar clientes".
        if (key === "clients_view") next.delete("clients_edit");
      } else {
        next.add(key);
        if (key === "clients_edit") next.add("clients_view");
      }
      return next;
    });
  }

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
      <p className="text-xs text-gray-400">
        Funciones que <strong className="text-white">{user.name}</strong> puede usar. Lo que no marques
        queda oculto y bloqueado. La tienda, usuarios, estadísticas y ajustes son siempre solo del administrador.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {WORKER_PERMISSIONS.map((p) => {
          const on = selected.has(p.key);
          return (
            <label
              key={p.key}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                on ? "border-brand-cyan/30 bg-brand-cyan/5" : "border-white/8 bg-white/[0.02]"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(p.key)}
                className="mt-0.5 w-4 h-4 rounded border-gray-600 text-brand-cyan focus:ring-brand-cyan bg-black"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{p.label}</span>
                <span className="block text-[11px] text-gray-500">{p.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(normalizePermissions([...selected]))}
          className="bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-6 py-2.5 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
        >
          Guardar permisos
        </button>
        <button
          type="button"
          onClick={() => setSelected(new Set(WORKER_PERMISSIONS.map((p) => p.key)))}
          className="text-xs font-bold px-3 py-2 rounded-lg border border-white/12 text-gray-300"
        >
          Marcar todo
        </button>
      </div>
    </div>
  );
}

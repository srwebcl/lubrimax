"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStaffUser,
  updateStaffUser,
  resetStaffPassword,
  forceLogoutStaff,
  deleteStaffUser,
} from "@/actions/admin-staff";
import { AddBtn, Sheet, Field, INPUT as KIT_INPUT, Msg, CARD } from "@/components/admin/kit";

type StaffUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "WORKER";
  isActive: boolean;
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
  const [showCreate, setShowCreate] = useState(false);

  function run(action: () => Promise<{ success: boolean; error?: string }>, okText: string) {
    setMsg(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setMsg({ type: "ok", text: okText });
        setEditing(null);
        setResetting(null);
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white">{u.name}</span>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border ${
                      u.role === "ADMIN"
                        ? "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30"
                        : "bg-white/5 text-gray-300 border-white/10"
                    }`}
                  >
                    {u.role === "ADMIN" ? "Admin" : "Trabajador"}
                  </span>
                  {!u.isActive && (
                    <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border bg-red-500/10 text-red-400 border-red-500/30">
                      Desactivado
                    </span>
                  )}
                  {u.id === currentUserId && (
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">(tú)</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1 font-mono">{u.email}</div>
                <div className="text-[11px] text-gray-600 mt-1">
                  Último ingreso:{" "}
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("es-CL") : "nunca"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setEditing(editing === u.id ? null : u.id);
                    setResetting(null);
                  }}
                  className="text-[10px] uppercase font-bold tracking-widest border border-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/10 px-3 py-2 rounded transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setResetting(resetting === u.id ? null : u.id);
                    setEditing(null);
                  }}
                  className="text-[10px] uppercase font-bold tracking-widest border border-white/10 text-gray-300 hover:bg-white/5 px-3 py-2 rounded transition-colors"
                >
                  Resetear clave
                </button>
                <button
                  disabled={pending}
                  onClick={() => run(() => forceLogoutStaff(u.id), "Sesiones cerradas.")}
                  className="text-[10px] uppercase font-bold tracking-widest border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 px-3 py-2 rounded transition-colors disabled:opacity-50"
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
                    className="text-[10px] uppercase font-bold tracking-widest border border-red-500/20 text-red-400 hover:bg-red-500/10 px-3 py-2 rounded transition-colors disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                )}
              </div>
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

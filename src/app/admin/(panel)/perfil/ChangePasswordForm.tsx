"use client";

import React, { useState } from "react";
import { changeMyPassword } from "@/actions/admin-staff";

export default function ChangePasswordForm() {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    if (fd.get("newPassword") !== fd.get("confirmPassword")) {
      setMsg({ type: "err", text: "La confirmación no coincide." });
      return;
    }

    setSaving(true);
    setMsg(null);
    const result = await changeMyPassword(fd);
    setSaving(false);

    if (result.success) {
      form.reset();
      setMsg({ type: "ok", text: "Contraseña actualizada." });
    } else {
      setMsg({ type: "err", text: result.error });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-white/5">
      <h3 className="text-sm text-gray-400 uppercase tracking-widest font-bold">
        Cambiar mi contraseña
      </h3>

      <input
        type="password"
        name="currentPassword"
        required
        autoComplete="current-password"
        placeholder="Contraseña actual"
        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan text-sm"
      />
      <input
        type="password"
        name="newPassword"
        required
        minLength={10}
        autoComplete="new-password"
        placeholder="Nueva contraseña (mín. 10 caracteres)"
        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan text-sm"
      />
      <input
        type="password"
        name="confirmPassword"
        required
        minLength={10}
        autoComplete="new-password"
        placeholder="Repetir nueva contraseña"
        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-cyan text-sm"
      />

      {msg && (
        <div
          className={`p-3 rounded-lg text-xs font-bold border ${
            msg.type === "ok"
              ? "bg-green-500/10 text-green-400 border-green-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Actualizar contraseña"}
      </button>
    </form>
  );
}

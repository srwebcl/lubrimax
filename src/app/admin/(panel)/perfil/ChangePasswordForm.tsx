"use client";

import React, { useState } from "react";
import { changeMyPassword } from "@/actions/admin-staff";
import { INPUT, Msg } from "@/components/admin/kit";

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
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-sm font-bold text-white">Cambiar mi contraseña</h3>

      <input
        type="password"
        name="currentPassword"
        required
        autoComplete="current-password"
        placeholder="Contraseña actual"
        className={INPUT}
      />
      <input
        type="password"
        name="newPassword"
        required
        minLength={10}
        autoComplete="new-password"
        placeholder="Nueva contraseña (mín. 10)"
        className={INPUT}
      />
      <input
        type="password"
        name="confirmPassword"
        required
        minLength={10}
        autoComplete="new-password"
        placeholder="Repetir nueva contraseña"
        className={INPUT}
      />

      {msg && <Msg kind={msg.type}>{msg.text}</Msg>}

      <button
        type="submit"
        disabled={saving}
        className="w-full h-11 rounded-xl bg-brand-cyan text-brand-pure text-sm font-bold disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Actualizar contraseña"}
      </button>
    </form>
  );
}

"use client";

import { logout } from "@/actions/auth";

export default function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-red-500/25 bg-red-500/5 text-red-400 font-bold text-sm"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Cerrar sesión
    </button>
  );
}

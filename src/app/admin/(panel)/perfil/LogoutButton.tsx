"use client";

import { logout } from "@/actions/auth";

export default function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="mt-4 w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors font-bold uppercase text-xs tracking-widest"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Cerrar Sesión
    </button>
  );
}

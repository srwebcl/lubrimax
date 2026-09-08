import Link from "next/link";

export const metadata = {
  title: "Sin conexión | Lubrimax",
  robots: { index: false },
};

// Página de reserva que muestra el service worker cuando una navegación
// pública falla por falta de red. No consume datos ni sesión.
export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-brand-pure text-brand-chrome flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center bg-brand-surface/80 border border-white/10 rounded-2xl p-8">
        <div className="w-14 h-14 mx-auto mb-6 rounded-full border border-white/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728m3.535 9.193a4 4 0 010-5.657m5.657 0a4 4 0 010 5.657M12 12h.01M3 3l18 18"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white uppercase tracking-widest italic mb-2">
          Sin conexión
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          No pudimos cargar esta página porque no hay internet. Revisa tu conexión y vuelve a
          intentar.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-lg hover:bg-white transition-colors"
        >
          Reintentar
        </Link>
      </div>
    </div>
  );
}

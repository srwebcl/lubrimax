"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Tarjeta para instalar la PWA. Se oculta sola si ya está instalada.
// - Android/Chrome: botón nativo (beforeinstallprompt).
// - iOS/Safari: instrucciones (no hay API de instalación).
export default function InstallCard() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [standalone, setStandalone] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // iOS
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setDone(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (standalone || done) return null;
  if (!deferred && !isIOS) return null; // navegador de escritorio sin soporte: no molestar

  return (
    <div className="bg-brand-cyan/[0.07] border border-brand-cyan/20 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-brand-cyan mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16"
          />
        </svg>
        <div className="flex-1">
          <h4 className="text-brand-cyan text-xs font-bold uppercase tracking-widest">
            Instalar la aplicación
          </h4>
          {deferred ? (
            <>
              <p className="text-gray-300 text-sm mt-1">
                Tenla como una app en tu pantalla de inicio, sin barra del navegador.
              </p>
              <button
                onClick={async () => {
                  await deferred.prompt();
                  const choice = await deferred.userChoice;
                  if (choice.outcome === "accepted") setDone(true);
                  setDeferred(null);
                }}
                className="mt-3 bg-brand-cyan text-brand-pure font-bold uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl"
              >
                Instalar ahora
              </button>
            </>
          ) : (
            <p className="text-gray-300 text-sm mt-1 leading-relaxed">
              En Safari, toca el botón <strong>Compartir</strong> y luego{" "}
              <strong>“Agregar a inicio”</strong>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

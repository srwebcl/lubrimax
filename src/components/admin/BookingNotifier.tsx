"use client";

import { useEffect, useRef, useState } from "react";
import { getRecentPaidBookings, type NewBookingNotice } from "@/actions/admin-notifications";

const POLL_MS = 30_000;
const DISMISS_KEY = "lubrimax_notif_banner_dismissed";

/**
 * Muestra la notificación. En Android y en la PWA de iOS `new Notification()`
 * NO existe ("Illegal constructor"): hay que pasar por el service worker.
 * El constructor directo queda solo como respaldo (escritorio / dev sin SW).
 */
async function showNotice(b: NewBookingNotice) {
  const [y, m, d] = b.date.split("-");
  // El estado de pago va en el TÍTULO: en la recepción no puede haber dudas.
  const amount = `$${b.amount.toLocaleString("es-CL")}`;
  // Reservas nuevas: sin pago (se cobra en el local). "PAGADA" solo aparece en
  // reservas antiguas que sí se pagaron por Webpay.
  const title = b.paid ? `Nueva reserva · PAGADA ${amount}` : `Nueva reserva · ${amount} por cobrar`;
  const options: NotificationOptions = {
    body: `${b.customerName} · ${d}/${m}/${y} ${b.startTime}${b.paid ? " · pagó online" : " · se cobra en el local"}`,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `booking-${b.id}`,
    data: { url: "/admin" },
  };

  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration) {
    await registration.showNotification(title, options);
    return;
  }
  const n = new Notification(title, options);
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

/**
 * Aviso de reservas nuevas mientras el panel está abierto (polling cada 30 s).
 * Limitación: con la app cerrada o en segundo plano el navegador congela el
 * polling; para avisos con la app cerrada hace falta Web Push.
 */
export default function BookingNotifier() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [dismissed, setDismissed] = useState(true);
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única de APIs del navegador al montar
    setPermission("Notification" in window ? Notification.permission : "unsupported");
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (permission !== "granted") return;
    let cancelled = false;

    async function poll() {
      try {
        const recent = await getRecentPaidBookings();
        if (cancelled) return;
        if (seenRef.current === null) {
          // Primera lectura: solo registra lo existente, no avisa reservas viejas.
          seenRef.current = new Set(recent.map((b) => b.id));
          return;
        }
        for (const b of recent) {
          if (seenRef.current.has(b.id)) continue;
          seenRef.current.add(b.id);
          await showNotice(b).catch((err) => console.error("No se pudo mostrar la notificación:", err));
        }
      } catch (error) {
        console.error("Error consultando reservas nuevas:", error);
      }
    }

    poll();
    const intervalId = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [permission]);

  async function requestPermission() {
    setPermission(await Notification.requestPermission());
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  if (permission !== "default" || dismissed) return null;

  return (
    <div className="fixed left-4 right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-4 md:right-auto z-50 bg-brand-surface border border-brand-cyan/30 p-4 rounded-2xl shadow-2xl flex items-center gap-3 md:max-w-sm">
      <div className="flex-1 min-w-0">
        <h3 className="text-brand-cyan font-bold text-sm">Avisos de reservas</h3>
        <p className="text-xs text-gray-400 mt-1">
          Recibe un aviso cuando alguien reserva en la web (con el panel abierto).
        </p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={requestPermission}
          className="bg-brand-cyan text-black text-xs font-bold px-3 py-2 rounded-xl hover:bg-cyan-400 transition-colors"
        >
          Activar
        </button>
        <button onClick={dismiss} className="text-[11px] text-gray-500 hover:text-gray-300">
          Ahora no
        </button>
      </div>
    </div>
  );
}

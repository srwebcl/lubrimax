"use client";

import { useEffect } from "react";

// Registra el service worker (/public/sw.js) solo en producción y en el
// cliente. En desarrollo se omite a propósito para no pelear con el HMR de
// Next ni servir assets cacheados viejos.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("SW no registrado:", err));
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}

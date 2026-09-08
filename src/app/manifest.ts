import type { MetadataRoute } from "next";

// Web App Manifest (App Router). Se sirve en /manifest.webmanifest.
// `start_url` apunta al panel: la PWA está pensada para que el personal
// (admin y trabajadores) la instale en el teléfono y entre directo a operar.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LUBRIMAX — Panel",
    short_name: "Lubrimax",
    description:
      "Panel de operaciones de LUBRIMAX: agenda de reservas y gestión para el equipo.",
    id: "/admin",
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "es-CL",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Agenda",
        short_name: "Agenda",
        description: "Ver la agenda de reservas",
        url: "/admin",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}

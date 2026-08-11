import type { NextConfig } from "next";

// Cloudflare R2 sirve las imágenes subidas por el admin (ver src/lib/r2.ts y
// src/app/api/upload/route.ts) desde el dominio público configurado en
// NEXT_PUBLIC_R2_DEV_URL. Lo parseamos acá para que next/image pueda
// optimizarlas; si la variable no está seteada (ej. dev local sin R2),
// simplemente no se agrega el patrón y next/image seguirá funcionando para
// el resto de las imágenes.
function r2RemotePattern() {
  const url = process.env.NEXT_PUBLIC_R2_DEV_URL;
  if (!url) return null;
  try {
    const { protocol, hostname } = new URL(url);
    return {
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
    };
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      ...(r2RemotePattern() ? [r2RemotePattern()!] : []),
    ],
  },
};

export default nextConfig;

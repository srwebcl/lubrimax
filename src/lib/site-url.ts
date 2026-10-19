/**
 * Utilidades para resolver la URL canónica y oficial del sitio.
 * 
 * Evita que redirecciones de reservas o pagos Webpay manden al cliente
 * a URLs técnicas de Vercel (ej. https://lubrimax-*.vercel.app) en vez del
 * dominio oficial de producción (https://www.lubrimax.cl).
 */

export const OFFICIAL_SITE_URL = "https://www.lubrimax.cl";
export const OFFICIAL_LOGO_URL = "https://pub-d1c3e2214af141ec8ef9a12538f88a3d.r2.dev/logo-lubrimax.png";

/**
 * Resuelve la URL base adecuada para redirecciones y callbacks (ej. Webpay).
 * 
 * Reglas de prioridad:
 * 1. Si la petición viene desde un host con "lubrimax.cl" (ej. www.lubrimax.cl o lubrimax.cl),
 *    se usa exactamente ese host con https.
 * 2. Si estamos en desarrollo local (localhost o 127.0.0.1), se mantiene localhost.
 * 3. Si NEXT_PUBLIC_SITE_URL está configurada y NO es una URL de vercel.app ni localhost en prod, se usa.
 * 4. Fallback absoluto de producción: SIEMPRE el dominio oficial https://www.lubrimax.cl.
 */
export function getSiteBaseUrl(req?: Request): string {
  if (req) {
    const forwardedHost = req.headers.get("x-forwarded-host");
    const host = (forwardedHost || req.headers.get("host") || "").trim().toLowerCase();
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");

    // Si la petición viene desde el dominio oficial o cualquier subdominio de lubrimax.cl
    if (host.includes("lubrimax.cl")) {
      return `https://${host}`;
    }

    // Si es desarrollo local
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return `${proto}://${host}`;
    }
  }

  // Si hay una variable de entorno configurada
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    // Si contiene "vercel.app", la ignoramos porque el cliente solicitó usar el link oficial
    if (!envUrl.includes("vercel.app") && (!envUrl.includes("localhost") || process.env.NODE_ENV !== "production")) {
      return envUrl.replace(/\/+$/, "");
    }
  }

  // Fallback de producción
  return OFFICIAL_SITE_URL;
}

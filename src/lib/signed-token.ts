// Helper genérico de tokens firmados con HMAC-SHA256 (Web Crypto, compatible
// con runtime Node y Edge). Lo usan tanto la sesión de admin como la de
// cliente: una cookie de sesión nunca debe ser un valor plano que cualquiera
// pueda copiar/adivinar (ej. el id de una fila de la BD) — debe venir firmada
// por el servidor para que no se pueda falsificar ni reutilizar entre cuentas.

const encoder = new TextEncoder();

function getKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function createSignedToken(
  secret: string,
  payload: Record<string, unknown>,
  maxAgeSeconds: number
) {
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify({ ...payload, exp: Date.now() + maxAgeSeconds * 1000 })));
  const signature = await crypto.subtle.sign("HMAC", await getKey(secret), encoder.encode(payloadB64));
  return `${payloadB64}.${toBase64Url(signature)}`;
}

/** Devuelve el payload verificado, o null si la firma/expiración no son válidas. */
export async function verifySignedToken<T extends Record<string, unknown> = Record<string, unknown>>(
  secret: string,
  token: string | undefined | null
): Promise<T | null> {
  if (!token) return null;
  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(secret),
      fromBase64Url(signatureB64),
      encoder.encode(payloadB64)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
    if (typeof payload.exp !== "number" || Date.now() >= payload.exp) return null;
    return payload as T;
  } catch {
    return null;
  }
}

// Token de sesión de admin firmado con HMAC-SHA256 (Web Crypto, compatible con
// runtime Node y Edge). Reemplaza la cookie de valor fijo "authenticated",
// que cualquiera podía copiar/adivinar para entrar al panel.

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET (o ADMIN_PASSWORD) no está configurado.");
  }
  return secret;
}

function getKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
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

export async function createAdminSessionToken(maxAgeSeconds: number) {
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify({ exp: Date.now() + maxAgeSeconds * 1000 })));
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(payloadB64));
  return `${payloadB64}.${toBase64Url(signature)}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token) return false;
  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return false;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      fromBase64Url(signatureB64),
      encoder.encode(payloadB64)
    );
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
    return typeof payload.exp === "number" && Date.now() < payload.exp;
  } catch {
    return false;
  }
}

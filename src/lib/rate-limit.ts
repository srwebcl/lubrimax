// Rate limiter en memoria, best-effort. Sin una base compartida (Redis/KV)
// esto NO es un límite global confiable en Vercel: cada instancia
// serverless tiene su propio Map, así que un atacante que golpee varias
// instancias en paralelo puede evadirlo parcialmente. Aun así frena el caso
// común (un script pegándole repetido a una misma instancia tibia) y en
// self-host/Node server es un límite real. Para algo robusto en serverless,
// migrar a Upstash Redis (integración de Vercel Marketplace) con la misma
// interfaz.
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function cleanup(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export async function getClientIp() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

export function getClientIpFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) cleanup(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true as const };
  }

  if (bucket.count >= limit) {
    return { allowed: false as const, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { allowed: true as const };
}

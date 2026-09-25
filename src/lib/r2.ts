import { S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

/**
 * Cliente S3 de Cloudflare R2, creado al primer uso. Antes se lanzaba un
 * error al IMPORTAR el módulo si faltaba R2_ACCOUNT_ID, lo que tumbaba
 * cualquier ruta que lo importara (ej. un preview sin esa variable).
 */
export function getR2() {
  if (client) return client;
  if (!process.env.R2_ACCOUNT_ID) {
    throw new Error("R2_ACCOUNT_ID no está configurado.");
  }
  client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
    // Disable automatic checksums that break Cloudflare R2 presigned URLs
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

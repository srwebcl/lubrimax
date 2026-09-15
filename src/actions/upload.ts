"use server";

// Sube archivos grandes (sobre todo videos) directo del navegador a
// Cloudflare R2, sin pasar por una Server Action / Route Handler de
// Next.js. Los Functions de Vercel tienen un límite duro de ~4.5MB en el
// cuerpo de la petición — un video de unos pocos segundos ya lo supera, y
// el POST a /api/upload fallaba con "Request Entity Too Large" (que el
// cliente intentaba leer como JSON y explotaba con "Unexpected token 'R'").
//
// La solución estándar para esto es una URL pre-firmada: el servidor solo
// firma un permiso de escritura de corta duración (esto sí es liviano,
// nunca toca el archivo), y el navegador sube el archivo directo al bucket.
//
// Requiere que el bucket de R2 tenga configurado CORS permitiendo PUT desde
// el dominio del sitio (ver docs/PWA-Y-ROLES.md).

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/lib/r2";
import { verifyStaffSession } from "@/lib/staff-session";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;

export async function getUploadUrl(fileName: string, contentType: string) {
  const session = await verifyStaffSession();
  if (!session) {
    return { error: "No autorizado." };
  }

  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    return { error: "R2_BUCKET_NAME no está configurado en el servidor." };
  }

  const safeName = (fileName || "archivo").replace(/[^a-zA-Z0-9.\-_]/g, "");
  const key = `${Date.now()}-${safeName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_DEV_URL}/${key}`;

    return { uploadUrl, publicUrl, contentType: contentType || "application/octet-stream" };
  } catch (error) {
    console.error("getUploadUrl:", error);
    return { error: "No se pudo preparar la subida del archivo." };
  }
}

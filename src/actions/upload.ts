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
import { getR2 } from "@/lib/r2";
import { verifyStaffSession } from "@/lib/staff-session";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;

// Solo imágenes y videos. Nada de HTML/SVG/JS: el bucket es público y un
// archivo así serviría para alojar phishing o scripts con nuestra URL.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/heic", "image/heif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;

export async function getUploadUrl(fileName: string, contentType: string, size: number) {
  const session = await verifyStaffSession();
  if (!session) {
    return { error: "No autorizado." };
  }

  const isImage = IMAGE_TYPES.includes(contentType);
  const isVideo = VIDEO_TYPES.includes(contentType);
  if (!isImage && !isVideo) {
    return { error: "Tipo de archivo no permitido. Sube una imagen (JPG, PNG, WebP…) o un video (MP4, WebM, MOV)." };
  }
  // Los videos solo los sube el administrador (contenido del sitio).
  if (isVideo && session.role !== "ADMIN") {
    return { error: "No autorizado para subir videos." };
  }
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!Number.isInteger(size) || size <= 0 || size > maxBytes) {
    return { error: `El archivo supera el máximo de ${Math.round(maxBytes / 1024 / 1024)} MB.` };
  }

  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    return { error: "R2_BUCKET_NAME no está configurado en el servidor." };
  }

  const safeName = (fileName || "archivo").replace(/[^a-zA-Z0-9.\-_]/g, "");
  const key = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      // Firmado en la URL: R2 rechaza un cuerpo de otro tamaño.
      ContentLength: size,
    });

    const uploadUrl = await getSignedUrl(getR2(), command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_DEV_URL}/${key}`;

    return { uploadUrl, publicUrl, contentType };
  } catch (error) {
    console.error("getUploadUrl:", error);
    return { error: "No se pudo preparar la subida del archivo." };
  }
}

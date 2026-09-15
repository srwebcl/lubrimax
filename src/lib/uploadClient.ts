// Helper de cliente único para subir archivos (imágenes, videos, fotos de
// recepción) a Cloudflare R2. Reemplaza el viejo patrón de cada página
// admin haciendo su propio fetch a /api/upload — ese endpoint pasaba el
// archivo por el servidor de Next.js y chocaba con el límite de ~4.5MB por
// request de Vercel Functions en cuanto el archivo era un video.
//
// Ahora: el servidor solo firma un permiso de subida (getUploadUrl, en
// actions/upload.ts) y el navegador sube el archivo DIRECTO a R2.

import { getUploadUrl } from "@/actions/upload";

export async function uploadFileToR2(file: File): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const result = await getUploadUrl(file.name, contentType);

  if ("error" in result) {
    throw new Error(result.error);
  }

  const res = await fetch(result.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": result.contentType },
    body: file,
  });

  if (!res.ok) {
    throw new Error(
      `No se pudo subir el archivo a R2 (código ${res.status}). Si el problema persiste, revisa la configuración de CORS del bucket.`
    );
  }

  return result.publicUrl;
}

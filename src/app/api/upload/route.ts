import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";
import { cookies } from "next/headers";
import { verifyAdminSessionToken } from "@/lib/admin-session";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("lubrimax_admin_session")?.value;
    if (!(await verifyAdminSessionToken(session))) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Asegurarse de que el nombre del archivo sea único
    const uniqueFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const bucketName = process.env.R2_BUCKET_NAME!;

    const buffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFilename,
      Body: buffer,
      ContentType: file.type,
    });

    // Subir el archivo directamente desde el servidor (Next.js API) a Cloudflare R2
    await r2.send(command);
    
    // Calcular la URL pública final de la imagen
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_DEV_URL}/${uniqueFilename}`;

    return NextResponse.json({ publicUrl });
  } catch (error: any) {
    console.error("Error al subir archivo a R2:", error);
    return NextResponse.json({ 
      error: "Error al subir imagen. Verifica las credenciales (R2_SECRET_ACCESS_KEY) en Vercel.",
      details: error.message 
    }, { status: 500 });
  }
}

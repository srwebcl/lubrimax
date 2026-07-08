import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/lib/r2";

export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
    }

    // Asegurarse de que el nombre del archivo sea único
    const uniqueFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, "")}`;
    const bucketName = process.env.R2_BUCKET_NAME!;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFilename,
      ContentType: contentType,
    });

    // Generar la URL prefirmada, válida por 60 segundos
    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 60 });
    
    // Calcular la URL pública final de la imagen
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_DEV_URL}/${uniqueFilename}`;

    return NextResponse.json({ signedUrl, publicUrl });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }
}

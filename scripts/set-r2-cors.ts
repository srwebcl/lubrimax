import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

// Cargar variables de entorno desde .env local
dotenv.config();

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error("Faltan variables de entorno R2 en el archivo .env");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const command = new PutBucketCorsCommand({
  Bucket: bucketName,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedHeaders: ["*"],
        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        AllowedOrigins: ["*"], // Permite todos los dominios (localhost y vercel)
        ExposeHeaders: ["ETag"],
        MaxAgeSeconds: 3000,
      },
    ],
  },
});

async function run() {
  try {
    await client.send(command);
    console.log("¡Reglas CORS actualizadas exitosamente en el Bucket R2 de Cloudflare!");
  } catch (error) {
    console.error("Error al actualizar CORS:", error);
  }
}

run();

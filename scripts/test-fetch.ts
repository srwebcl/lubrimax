import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
} as any);

async function test() {
  const cmd = new PutObjectCommand({ 
    Bucket: process.env.R2_BUCKET_NAME!, 
    Key: "test-fetch-browser.txt",
    ContentType: "text/plain"
  });
  const url = await getSignedUrl(client, cmd, { 
    expiresIn: 60,
    signableHeaders: new Set(["content-type"])
  });
  
  console.log("URL:", url);

  // Now emulate the browser's fetch
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "text/plain",
      "Origin": "https://lubrimax-eta.vercel.app"
    },
    body: "hello browser emulation"
  });

  console.log("STATUS:", res.status);
  console.log("TEXT:", await res.text());
}
test();

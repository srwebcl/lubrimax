import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client1 = new S3Client({
  region: "auto",
  endpoint: "https://foo.r2.cloudflarestorage.com",
  credentials: { accessKeyId: "foo", secretAccessKey: "bar" }
});

const client2 = new S3Client({
  region: "auto",
  endpoint: "https://foo.r2.cloudflarestorage.com",
  credentials: { accessKeyId: "foo", secretAccessKey: "bar" },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
} as any);

async function test() {
  const cmd = new PutObjectCommand({ Bucket: "b", Key: "k" });
  const url1 = await getSignedUrl(client1, cmd, { expiresIn: 60 });
  const url2 = await getSignedUrl(client2, cmd, { expiresIn: 60 });
  console.log("URL1 includes checksum?", url1.includes("checksum"));
  console.log("URL2 includes checksum?", url2.includes("checksum"));
}
test();

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
export const bucketName = process.env.R2_BUCKET_NAME || "trackforge-storage";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function getUploadUrl(key: string, contentType: string, expiresInSeconds = 3600) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

export async function getDownloadUrl(key: string, expiresInSeconds = 3600) {
  if (!key) return null;
  
  // If it's already a full HTTP URL (e.g. sample avatar or local placeholder), return as is
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
  } catch (error) {
    console.error("Failed to generate presigned download URL:", error);
    return null;
  }
}

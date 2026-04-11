import { randomUUID } from 'crypto';
import path from 'path';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL;

const ensureValue = (value: string | undefined, variableName: string): string => {
  if (!value) {
    throw new Error(`${variableName} is required`);
  }

  return value;
};

const accountId = ensureValue(R2_ACCOUNT_ID, 'CLOUDFLARE_R2_ACCOUNT_ID');
const accessKeyId = ensureValue(R2_ACCESS_KEY_ID, 'CLOUDFLARE_R2_ACCESS_KEY_ID');
const secretAccessKey = ensureValue(R2_SECRET_ACCESS_KEY, 'CLOUDFLARE_R2_SECRET_ACCESS_KEY');
const bucketName = ensureValue(R2_BUCKET_NAME, 'CLOUDFLARE_R2_BUCKET_NAME');
const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

const r2Client = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Uploads binary content to Cloudflare R2 and returns a public URL.
 */
export const uploadToR2 = async (
  buffer: Buffer,
  key: string,
  mimeType: string,
  isPublic = true,
): Promise<string> => {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: {
        visibility: isPublic ? 'public' : 'private',
      },
    }),
  );

  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  }

  return `${endpoint}/${bucketName}/${key}`;
};

/**
 * Removes an object from Cloudflare R2.
 */
export const deleteFromR2 = async (key: string): Promise<void> => {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );
};

/**
 * Generates a deterministic storage key scoped by folder path.
 */
export const generateUniqueKey = (folder: string, originalName: string): string => {
  const extension = path.extname(originalName).replace('.', '').toLowerCase() || 'webp';
  const normalizedFolder = folder.replace(/\/$/, '');

  return `${normalizedFolder}/${Date.now()}-${randomUUID()}.${extension}`;
};

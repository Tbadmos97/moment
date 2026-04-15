import { randomUUID } from 'crypto';
import path from 'path';

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ensureValue = (value: string | undefined, variableName: string): string => {
  if (!value) {
    throw new Error(`${variableName} is required`);
  }

  return value;
};

const getR2Config = (): {
  client: S3Client;
  bucketName: string;
  endpoint: string;
} => {
  const accountId = ensureValue(process.env.CLOUDFLARE_R2_ACCOUNT_ID, 'CLOUDFLARE_R2_ACCOUNT_ID');
  const accessKeyId = ensureValue(process.env.CLOUDFLARE_R2_ACCESS_KEY_ID, 'CLOUDFLARE_R2_ACCESS_KEY_ID');
  const secretAccessKey = ensureValue(
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  );
  const bucketName = ensureValue(process.env.CLOUDFLARE_R2_BUCKET_NAME, 'CLOUDFLARE_R2_BUCKET_NAME');
  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

  return {
    bucketName,
    endpoint,
    client: new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
  };
};

/**
 * Uploads binary content to Cloudflare R2 and returns a public URL.
 */
export const uploadToR2 = async (
  buffer: Buffer,
  key: string,
  mimeType: string,
  isPublic = true,
): Promise<string> => {
  const { client, bucketName, endpoint } = getR2Config();
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim();

  await client.send(
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

  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  }

  return `${endpoint}/${bucketName}/${key}`;
};

/**
 * Removes an object from Cloudflare R2.
 */
export const deleteFromR2 = async (key: string): Promise<void> => {
  const { client, bucketName } = getR2Config();

  await client.send(
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

import sharp from 'sharp';

export interface ProcessedImageResult {
  processedBuffer: Buffer;
  thumbnailBuffer: Buffer;
  width: number;
  height: number;
  fileSize: number;
  mimeType: 'image/webp';
}

/**
 * Produces optimized web images and thumbnails while stripping metadata.
 */
export const processImage = async (buffer: Buffer): Promise<ProcessedImageResult> => {
  const metadata = await sharp(buffer).metadata();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const processedBuffer = await sharp(buffer)
    .resize({
      width: 2048,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();

  const thumbnailBuffer = await sharp(buffer)
    .resize({
      width: 400,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 70 })
    .toBuffer();

  return {
    processedBuffer,
    thumbnailBuffer,
    width,
    height,
    fileSize: processedBuffer.byteLength,
    mimeType: 'image/webp',
  };
};

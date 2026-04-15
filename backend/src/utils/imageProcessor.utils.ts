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
  const base = sharp(buffer).rotate();
  const metadata = await base.metadata();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const processedBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: 1920,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toBuffer();

  const thumbnailBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: 600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 70, effort: 4, smartSubsample: true })
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

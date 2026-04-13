import type { Request, Response } from 'express';
import { Types } from 'mongoose';

import Photo from '../models/Photo.model';
import type { AppError } from '../types/auth.types';
import asyncHandler from '../utils/asyncHandler';
import { deleteFromR2, generateUniqueKey, uploadToR2 } from '../utils/r2.utils';
import { CACHE_KEYS, deleteCachePattern } from '../utils/redis.utils';
import { processImage } from '../utils/imageProcessor.utils';

type UploadPhotoBody = {
  title?: string;
  caption?: string;
  locationName?: string;
  people?: string[] | string;
  tags?: string[] | string;
  isPublished?: string | boolean;
  location?: {
    name?: string;
  };
  'location.name'?: string;
};

type UpdatePhotoBody = {
  title?: string;
  caption?: string;
  locationName?: string;
  people?: string[] | string;
  tags?: string[] | string;
  isPublished?: boolean | string;
  location?: {
    name?: string;
  };
  'location.name'?: string;
};

const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
};

const parseStringArray = (input: string[] | string | undefined, toLower = false): string[] => {
  if (!input) {
    return [];
  }

  let normalized: string[];

  if (Array.isArray(input)) {
    normalized = input;
  } else if (input.trim().startsWith('[')) {
    try {
      normalized = JSON.parse(input) as string[];
    } catch {
      normalized = [];
    }
  } else {
    normalized = input.split(',');
  }

  return normalized
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (toLower ? value.toLowerCase() : value));
};

const invalidatePhotoCache = async (photoId?: string): Promise<void> => {
  try {
    await deleteCachePattern(`${CACHE_KEYS.PHOTOS_LIST}*`);
    if (photoId) {
      await deleteCachePattern(`${CACHE_KEYS.PHOTO_DETAIL}:${photoId}*`);
    }
  } catch {
    // Cache invalidation should never break write operations.
  }
};

const resolveLocationName = (body: UploadPhotoBody | UpdatePhotoBody): string | undefined => {
  const locationName = body.locationName ?? body.location?.name ?? body['location.name'];
  const value = typeof locationName === 'string' ? locationName.trim() : '';

  return value ? value : undefined;
};

/**
 * Uploads, processes, stores, and persists a photo with creator metadata.
 */
export const uploadPhoto = asyncHandler(async (req: Request<unknown, unknown, UploadPhotoBody>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  if (!req.file) {
    throw createError('Image file is required', 400);
  }

  const title = req.body.title?.trim();

  if (!title) {
    throw createError('Title is required', 400);
  }

  const processed = await processImage(req.file.buffer);
  const mainKey = generateUniqueKey(`photos/${req.user.id}`, `${req.file.originalname}.webp`);
  const thumbnailKey = generateUniqueKey(`photos/${req.user.id}/thumbnails`, `${req.file.originalname}.webp`);

  let imageUrl: string | null = null;
  let thumbnailUrl: string | null = null;

  try {
    imageUrl = await uploadToR2(processed.processedBuffer, mainKey, processed.mimeType, true);
    thumbnailUrl = await uploadToR2(processed.thumbnailBuffer, thumbnailKey, processed.mimeType, true);

    const people = parseStringArray(req.body.people, false).slice(0, 10);
    const tags = parseStringArray(req.body.tags, true).slice(0, 10);
    const caption = req.body.caption?.trim() ?? '';
    const locationName = resolveLocationName(req.body);
    const isPublished =
      typeof req.body.isPublished === 'boolean'
        ? req.body.isPublished
        : req.body.isPublished === 'false'
          ? false
          : true;

    const photo = await Photo.create({
      title,
      caption,
      location: locationName ? { name: locationName } : undefined,
      people,
      tags,
      imageUrl,
      thumbnailUrl,
      imageKey: mainKey,
      thumbnailKey,
      width: processed.width,
      height: processed.height,
      fileSize: processed.fileSize,
      mimeType: processed.mimeType,
      creator: new Types.ObjectId(req.user.id),
      isPublished,
    });

    const populatedPhoto = await Photo.findById(photo._id).populate('creator', 'username email role avatar');

    await invalidatePhotoCache(String(photo._id));

    return res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        photo: populatedPhoto,
      },
    });
  } catch (error) {
    if (imageUrl || thumbnailUrl) {
      await Promise.allSettled([
        deleteFromR2(mainKey),
        deleteFromR2(thumbnailKey),
      ]);
    }

    throw error;
  }
});

/**
 * Updates editable metadata for a creator-owned photo.
 */
export const updatePhoto = asyncHandler(async (req: Request<{ id: string }, unknown, UpdatePhotoBody>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const photo = await Photo.findById(req.params.id);

  if (!photo) {
    throw createError('Photo not found', 404);
  }

  if (String(photo.creator) !== req.user.id) {
    throw createError('You do not have permission to edit this photo', 403);
  }

  if (typeof req.body.title === 'string') {
    photo.title = req.body.title.trim();
  }

  if (typeof req.body.caption === 'string') {
    photo.caption = req.body.caption.trim();
  }

  const locationName = resolveLocationName(req.body);
  photo.location = locationName ? { name: locationName } : undefined;

  if (req.body.people !== undefined) {
    photo.people = parseStringArray(req.body.people, false).slice(0, 10);
  }

  if (req.body.tags !== undefined) {
    photo.tags = parseStringArray(req.body.tags, true).slice(0, 10);
  }

  if (req.body.isPublished !== undefined) {
    photo.isPublished =
      typeof req.body.isPublished === 'boolean'
        ? req.body.isPublished
        : req.body.isPublished === 'true';
  }

  await photo.save();

  const populatedPhoto = await Photo.findById(photo._id).populate('creator', 'username email role avatar');
  await invalidatePhotoCache(String(photo._id));

  return res.status(200).json({
    success: true,
    message: 'Photo updated successfully',
    data: {
      photo: populatedPhoto,
    },
  });
});

/**
 * Deletes photo assets, records, and related interactions for a creator-owned photo.
 */
export const deletePhoto = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const photo = await Photo.findById(req.params.id);

  if (!photo) {
    throw createError('Photo not found', 404);
  }

  if (String(photo.creator) !== req.user.id) {
    throw createError('You do not have permission to delete this photo', 403);
  }

  await Promise.allSettled([
    deleteFromR2(photo.imageKey),
    deleteFromR2(photo.thumbnailKey),
  ]);

  await photo.deleteOne();
  await invalidatePhotoCache(String(photo._id));

  return res.status(200).json({
    success: true,
    message: 'Photo deleted successfully',
  });
});

import type { Request, Response } from 'express';
import { Types } from 'mongoose';

import Comment from '../models/Comment.model';
import Like from '../models/Like.model';
import Photo from '../models/Photo.model';
import cacheService from '../services/cache.service';
import { analyzeImage } from '../services/imageAnalysis.service';
import type { AppError } from '../types/auth.types';
import asyncHandler from '../utils/asyncHandler';
import { deleteFromR2, generateUniqueKey, uploadToR2 } from '../utils/r2.utils';
import {
  CACHE_KEY_FACTORIES,
  CACHE_TTL_SECONDS,
  getCache,
  setCache,
} from '../utils/redis.utils';
import { processImage } from '../utils/imageProcessor.utils';

type UploadPhotoBody = {
  title?: string;
  caption?: string;
  locationName?: string;
  width?: string | number;
  height?: string | number;
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

type PhotosSort = 'latest' | 'popular' | 'trending';

type PhotosQuery = {
  page?: string;
  limit?: string;
  sort?: PhotosSort;
  tag?: string;
  search?: string;
};

type CreatorPhotosParams = {
  userId: string;
};

type PhotoIdParams = {
  id: string;
};

type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
};

type CachedListPayload = PaginatedResult<Record<string, unknown>>;

type CachedPhotoDetail = {
  photo: Record<string, unknown>;
};

type AnyDoc = Record<string, unknown>;

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

const dedupeTags = (values: string[]): string[] => {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
};

const DEFAULT_VIDEO_THUMBNAIL =
  process.env.VIDEO_FALLBACK_THUMBNAIL_URL?.trim() ||
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80';

const parsePositiveNumber = (value: string | number | undefined, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

const parsePaginationValue = (value: string | undefined, fallback: number): number => {
  const numeric = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(numeric) || numeric < 1) {
    return fallback;
  }

  return numeric;
};

const normalizePhoto = (photo: Record<string, unknown>, userId?: string): Record<string, unknown> => {
  const likes = Array.isArray(photo.likes) ? (photo.likes as Array<string | { _id?: string }>) : [];
  const isLiked =
    userId !== undefined
      ? likes.some((value) => {
          if (typeof value === 'string') {
            return value === userId;
          }

          return String(value?._id ?? '') === userId;
        })
      : false;

  return {
    ...photo,
    isLiked,
  };
};

const incrementPhotoViewCount = (photoId: string): void => {
  setImmediate(() => {
    void Photo.updateOne({ _id: photoId }, { $inc: { viewsCount: 1 } }).catch(() => undefined);
  });
};

/**
 * Returns paginated published photos with discovery filters and sort modes.
 */
export const getPhotos = asyncHandler(async (req: Request<unknown, unknown, unknown, PhotosQuery>, res: Response) => {
  const page = parsePaginationValue(req.query.page, 1);
  const limit = Math.min(parsePaginationValue(req.query.limit, 20), 50);
  const sort = (req.query.sort ?? 'latest') as PhotosSort;
  const normalizedSort: PhotosSort = ['latest', 'popular', 'trending'].includes(sort) ? sort : 'latest';
  const tag = req.query.tag?.trim().toLowerCase();
  const search = req.query.search?.trim();
  const skip = (page - 1) * limit;

  const cacheKey = CACHE_KEY_FACTORIES.photosList(page, limit, normalizedSort, tag, search);
  const cached = await getCache<CachedListPayload>(cacheKey);

  if (cached) {
    const mappedItems = cached.items.map((item) => normalizePhoto(item, req.user?.id));

    return res.status(200).json({
      success: true,
      message: 'Photos fetched successfully',
      fromCache: true,
      data: {
        photos: mappedItems,
        page: cached.page,
        limit: cached.limit,
        totalPages: cached.totalPages,
        total: cached.total,
        hasMore: cached.hasMore,
      },
    });
  }

  const baseFilter: Record<string, unknown> = {
    isPublished: true,
  };

  if (tag) {
    baseFilter.tags = tag;
  }

  if (search) {
    baseFilter.$text = { $search: search };
  }

  let items: Array<Record<string, unknown>> = [];
  let total = 0;

  if (normalizedSort === 'trending') {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendingFilter = {
      ...baseFilter,
      createdAt: { $gte: sevenDaysAgo },
    };

    const [aggregatedItems, totalAggregation] = await Promise.all([
      Photo.aggregate([
        { $match: trendingFilter },
        {
          $addFields: {
            trendingScore: {
              $add: [
                { $multiply: ['$likesCount', 2] },
                '$commentsCount',
              ],
            },
          },
        },
        { $sort: { trendingScore: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'creator',
            foreignField: '_id',
            as: 'creator',
            pipeline: [
              {
                $project: {
                  username: 1,
                  avatar: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            creator: { $arrayElemAt: ['$creator', 0] },
          },
        },
      ]),
      Photo.countDocuments(trendingFilter),
    ]);

    items = aggregatedItems as Array<Record<string, unknown>>;
    total = totalAggregation;
  } else {
    const sortQuery: Record<string, 1 | -1> = normalizedSort === 'popular' ? { likesCount: -1, createdAt: -1 } : { createdAt: -1 };

    const [photos, totalCount] = await Promise.all([
      Photo.find(baseFilter)
        .select('title caption location people tags imageUrl thumbnailUrl creator likes likesCount commentsCount viewsCount isPublished createdAt width height mimeType mediaType')
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate('creator', 'username avatar')
        .lean(),
      Photo.countDocuments(baseFilter),
    ]);

    items = photos as unknown as AnyDoc[];
    total = totalCount;
  }

  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const hasMore = page < totalPages;

  await setCache(
    cacheKey,
    {
      items,
      page,
      limit,
      totalPages,
      total,
      hasMore,
    } satisfies CachedListPayload,
    CACHE_TTL_SECONDS.PHOTOS_LIST,
  );

  const photos = items.map((item) => normalizePhoto(item, req.user?.id));

  return res.status(200).json({
    success: true,
    message: 'Photos fetched successfully',
    data: {
      photos,
      page,
      limit,
      totalPages,
      total,
      hasMore,
    },
  });
});

/**
 * Returns one published photo with creator and initial comments.
 */
export const getPhotoById = asyncHandler(async (req: Request<PhotoIdParams>, res: Response) => {
  const photoId = req.params.id;
  const cacheKey = CACHE_KEY_FACTORIES.photoDetail(photoId);
  const cached = await getCache<CachedPhotoDetail>(cacheKey);

  incrementPhotoViewCount(photoId);

  if (cached?.photo) {
    return res.status(200).json({
      success: true,
      message: 'Photo fetched successfully',
      fromCache: true,
      data: {
        photo: normalizePhoto(cached.photo, req.user?.id),
      },
    });
  }

  const photo = await Photo.findOne({ _id: photoId, isPublished: true })
    .select('title caption location people tags imageUrl thumbnailUrl creator likes likesCount commentsCount viewsCount isPublished createdAt width height mimeType mediaType')
    .populate('creator', '-password -refreshTokens')
    .lean();

  if (!photo) {
    throw createError('Photo not found', 404);
  }

  const comments = await Comment.find({ photo: photo._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('author', 'username avatar')
    .lean();

  const photoWithComments = {
    ...photo,
    comments,
  };

  await setCache(
    cacheKey,
    {
      photo: photoWithComments as AnyDoc,
    } satisfies CachedPhotoDetail,
    CACHE_TTL_SECONDS.PHOTO_DETAIL,
  );

  return res.status(200).json({
    success: true,
    message: 'Photo fetched successfully',
    data: {
      photo: normalizePhoto(photoWithComments as AnyDoc, req.user?.id),
    },
  });
});

/**
 * Returns paginated published photos for a specific creator.
 */
export const getPhotosByCreator = asyncHandler(async (req: Request<CreatorPhotosParams, unknown, unknown, PhotosQuery>, res: Response) => {
  const page = parsePaginationValue(req.query.page, 1);
  const limit = Math.min(parsePaginationValue(req.query.limit, 20), 50);
  const skip = (page - 1) * limit;
  const cacheKey = CACHE_KEY_FACTORIES.creatorPhotos(req.params.userId, page, limit);

  const cached = await getCache<CachedListPayload>(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: 'Creator photos fetched successfully',
      fromCache: true,
      data: {
        photos: cached.items.map((photo) => normalizePhoto(photo, req.user?.id)),
        page: cached.page,
        limit: cached.limit,
        totalPages: cached.totalPages,
        total: cached.total,
        hasMore: cached.hasMore,
      },
    });
  }

  const [photos, total] = await Promise.all([
    Photo.find({ creator: req.params.userId, isPublished: true })
      .select('title caption location people tags imageUrl thumbnailUrl creator likes likesCount commentsCount viewsCount isPublished createdAt width height mimeType mediaType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username avatar')
      .lean(),
    Photo.countDocuments({ creator: req.params.userId, isPublished: true }),
  ]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  await setCache(
    cacheKey,
    {
      items: photos as unknown as AnyDoc[],
      page,
      limit,
      totalPages,
      total,
      hasMore: page < totalPages,
    } satisfies CachedListPayload,
    CACHE_TTL_SECONDS.CREATOR_DASHBOARD,
  );

  return res.status(200).json({
    success: true,
    message: 'Creator photos fetched successfully',
    data: {
      photos: photos.map((photo) => normalizePhoto(photo as unknown as AnyDoc, req.user?.id)),
      page,
      limit,
      totalPages,
      total,
      hasMore: page < totalPages,
    },
  });
});

/**
 * Returns top trending tags from published photos.
 */
export const getTrendingTags = asyncHandler(async (_req: Request, res: Response) => {
  const cacheKey = CACHE_KEY_FACTORIES.trendingTags();
  const cached = await getCache<Array<{ tag: string; count: number }>>(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: 'Trending tags fetched successfully',
      fromCache: true,
      data: {
        tags: cached,
      },
    });
  }

  const tags = await Photo.aggregate([
    { $match: { isPublished: true, tags: { $exists: true, $ne: [] } } },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
    {
      $project: {
        _id: 0,
        tag: '$_id',
        count: 1,
      },
    },
  ]);

  await setCache(cacheKey, tags, CACHE_TTL_SECONDS.TRENDING_TAGS);

  return res.status(200).json({
    success: true,
    message: 'Trending tags fetched successfully',
    data: {
      tags,
    },
  });
});

/**
 * Returns top viewed published photo IDs for static generation.
 */
export const getTopViewedPhotos = asyncHandler(async (req: Request<unknown, unknown, unknown, { limit?: string }>, res: Response) => {
  const limit = Math.min(parsePaginationValue(req.query.limit, 50), 50);
  const cacheKey = CACHE_KEY_FACTORIES.topViewedPhotos(limit);
  const cached = await getCache<Array<{ _id: string }>>(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: 'Top viewed photos fetched successfully',
      fromCache: true,
      data: {
        photos: cached,
      },
    });
  }

  const photos = await Photo.find({ isPublished: true })
    .select('_id')
    .sort({ viewsCount: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  const payload = photos.map((photo) => ({ _id: String(photo._id) }));

  await setCache(cacheKey, payload, CACHE_TTL_SECONDS.TOP_VIEWED);

  return res.status(200).json({
    success: true,
    message: 'Top viewed photos fetched successfully',
    data: {
      photos: payload,
    },
  });
});

/**
 * Likes a photo for the authenticated user.
 */
export const likePhoto = asyncHandler(async (req: Request<PhotoIdParams>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const photo = await Photo.findById(req.params.id).select('_id likesCount isPublished');

  if (!photo || !photo.isPublished) {
    throw createError('Photo not found', 404);
  }

  const existingLike = await Like.findOne({ user: req.user.id, photo: req.params.id }).select('_id').lean();

  if (!existingLike) {
    await Like.create({
      user: new Types.ObjectId(req.user.id),
      photo: new Types.ObjectId(req.params.id),
    });
  }

  const updated = await Photo.findById(req.params.id).select('likesCount').lean();
  await cacheService.invalidatePhotoInteractions(req.params.id);

  return res.status(200).json({
    success: true,
    message: 'Photo liked successfully',
    data: {
      liked: true,
      likesCount: updated?.likesCount ?? photo.likesCount,
    },
  });
});

/**
 * Removes a like for the authenticated user.
 */
export const unlikePhoto = asyncHandler(async (req: Request<PhotoIdParams>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const photo = await Photo.findById(req.params.id).select('_id likesCount isPublished');

  if (!photo || !photo.isPublished) {
    throw createError('Photo not found', 404);
  }

  await Like.findOneAndDelete({ user: req.user.id, photo: req.params.id });

  const updated = await Photo.findById(req.params.id).select('likesCount').lean();
  await cacheService.invalidatePhotoInteractions(req.params.id);

  return res.status(200).json({
    success: true,
    message: 'Photo unliked successfully',
    data: {
      liked: false,
      likesCount: updated?.likesCount ?? Math.max(photo.likesCount - 1, 0),
    },
  });
});

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
    throw createError('Media file is required', 400);
  }

  const title = req.body.title?.trim();

  if (!title) {
    throw createError('Title is required', 400);
  }

  const isVideo = req.file.mimetype.startsWith('video/');
  const processed = !isVideo ? await processImage(req.file.buffer) : null;
  const mainKey = isVideo
    ? generateUniqueKey(`videos/${req.user.id}`, req.file.originalname)
    : generateUniqueKey(`photos/${req.user.id}`, `${req.file.originalname}.webp`);
  const thumbnailKey = isVideo
    ? mainKey
    : generateUniqueKey(`photos/${req.user.id}/thumbnails`, `${req.file.originalname}.webp`);

  let imageUrl: string | null = null;
  let thumbnailUrl: string | null = null;

  try {
    if (isVideo) {
      imageUrl = await uploadToR2(req.file.buffer, mainKey, req.file.mimetype, true);
      thumbnailUrl = DEFAULT_VIDEO_THUMBNAIL;
    } else {
      imageUrl = await uploadToR2(processed!.processedBuffer, mainKey, processed!.mimeType, true);
      thumbnailUrl = await uploadToR2(processed!.thumbnailBuffer, thumbnailKey, processed!.mimeType, true);
    }

    const people = parseStringArray(req.body.people, false).slice(0, 10);
    const creatorTags = parseStringArray(req.body.tags, true).slice(0, 10);
    const aiTagPredictions = isVideo ? [] : await analyzeImage(req.file.buffer);
    const aiTags = aiTagPredictions.map((item) => item.tag).slice(0, 8);
    const tags = dedupeTags([...creatorTags, ...aiTags]).slice(0, 10);
    const caption = req.body.caption?.trim() ?? '';
    const locationName = resolveLocationName(req.body);
    const isPublished =
      typeof req.body.isPublished === 'boolean'
        ? req.body.isPublished
        : req.body.isPublished === 'false'
          ? false
          : true;

    const mediaType = isVideo ? 'video' : 'image';

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
      width: isVideo ? parsePositiveNumber(req.body.width, 1280) : processed!.width,
      height: isVideo ? parsePositiveNumber(req.body.height, 720) : processed!.height,
      fileSize: isVideo ? req.file.size : processed!.fileSize,
      mimeType: isVideo ? req.file.mimetype : processed!.mimeType,
      mediaType,
      creator: new Types.ObjectId(req.user.id),
      isPublished,
    });

    const populatedPhoto = await Photo.findById(photo._id).populate('creator', 'username email role avatar');

    await Promise.all([
      cacheService.invalidatePhotoDetailAndLists(String(photo._id)),
      cacheService.invalidateTrendingTags(),
      cacheService.invalidateCreatorDashboard(req.user.id),
      cacheService.invalidateAdminCaches(),
    ]);

    return res.status(201).json({
      success: true,
      message: isVideo ? 'Video uploaded successfully' : 'Photo uploaded successfully',
      data: {
        photo: populatedPhoto,
        aiDetectedTags: aiTagPredictions,
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
 * Analyzes a selected image and returns AI-suggested tags before upload.
 */
export const analyzePhotoTags = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  if (!req.file) {
    throw createError('Image file is required', 400);
  }

  if (!req.file.mimetype.startsWith('image/')) {
    throw createError('AI tag analysis supports image files only', 422);
  }

  const tags = await analyzeImage(req.file.buffer);

  return res.status(200).json({
    success: true,
    message: 'AI tags analyzed successfully',
    data: {
      tags,
    },
  });
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
  await Promise.all([
    cacheService.invalidatePhotoDetailAndLists(String(photo._id)),
    cacheService.invalidateTrendingTags(),
    cacheService.invalidateCreatorDashboard(req.user.id),
    cacheService.invalidateAdminCaches(),
  ]);

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
  await Promise.all([
    cacheService.invalidatePhotoDetailAndLists(String(photo._id)),
    cacheService.invalidateTrendingTags(),
    cacheService.invalidateCreatorDashboard(req.user.id),
    cacheService.invalidateAdminCaches(),
  ]);

  return res.status(200).json({
    success: true,
    message: 'Photo deleted successfully',
  });
});

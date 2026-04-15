import type { Request, Response } from 'express';
import { Types } from 'mongoose';

import Comment from '../models/Comment.model';
import Photo from '../models/Photo.model';
import cacheService from '../services/cache.service';
import type { AppError } from '../types/auth.types';
import asyncHandler from '../utils/asyncHandler';
import {
  CACHE_KEY_FACTORIES,
  CACHE_TTL_SECONDS,
  getCache,
  setCache,
} from '../utils/redis.utils';

type PhotoCommentsParams = {
  photoId: string;
};

type CommentParams = {
  id: string;
};

type CreateCommentBody = {
  text?: string;
  rating?: number;
};

type PaginationQuery = {
  page?: string;
  limit?: string;
};

type CachedCommentsPayload = {
  comments: Array<Record<string, unknown>>;
  page: number;
  limit: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
  averageRating: number;
  totalRatings: number;
};

type RatingSummaryPayload = {
  averageRating: number;
  totalRatings: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
};

const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
};

const parsePaginationValue = (value: string | undefined, fallback: number): number => {
  const numeric = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(numeric) || numeric < 1) {
    return fallback;
  }

  return numeric;
};

const commentsCacheKey = (photoId: string, page: number, limit: number): string => {
  return CACHE_KEY_FACTORIES.comments(photoId, page, limit);
};

const ratingCacheKey = (photoId: string): string => CACHE_KEY_FACTORIES.ratingSummary(photoId);

const normalizeAverage = (value?: number | null): number => {
  if (!value || Number.isNaN(value)) {
    return 0;
  }

  return Math.round(value * 10) / 10;
};

const getRatingSummary = async (photoId: string): Promise<RatingSummaryPayload> => {
  const cached = await getCache<RatingSummaryPayload>(ratingCacheKey(photoId));

  if (cached) {
    return cached;
  }

  const [summaryRow] = await Comment.aggregate([
    {
      $match: {
        photo: new Types.ObjectId(photoId),
        rating: { $gte: 1, $lte: 5 },
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
        oneStar: {
          $sum: {
            $cond: [{ $eq: ['$rating', 1] }, 1, 0],
          },
        },
        twoStar: {
          $sum: {
            $cond: [{ $eq: ['$rating', 2] }, 1, 0],
          },
        },
        threeStar: {
          $sum: {
            $cond: [{ $eq: ['$rating', 3] }, 1, 0],
          },
        },
        fourStar: {
          $sum: {
            $cond: [{ $eq: ['$rating', 4] }, 1, 0],
          },
        },
        fiveStar: {
          $sum: {
            $cond: [{ $eq: ['$rating', 5] }, 1, 0],
          },
        },
      },
    },
  ]);

  const payload: RatingSummaryPayload = {
    averageRating: normalizeAverage(summaryRow?.averageRating),
    totalRatings: summaryRow?.totalRatings ?? 0,
    distribution: {
      '1': summaryRow?.oneStar ?? 0,
      '2': summaryRow?.twoStar ?? 0,
      '3': summaryRow?.threeStar ?? 0,
      '4': summaryRow?.fourStar ?? 0,
      '5': summaryRow?.fiveStar ?? 0,
    },
  };

  await setCache(ratingCacheKey(photoId), payload, CACHE_TTL_SECONDS.RATING_SUMMARY);

  return payload;
};

/**
 * Creates a comment on a photo for authenticated users.
 */
export const createComment = asyncHandler(async (req: Request<PhotoCommentsParams, unknown, CreateCommentBody>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const text = req.body.text?.trim();

  if (!text || text.length < 1 || text.length > 500) {
    throw createError('Comment must be between 1 and 500 characters', 400);
  }

  const photo = await Photo.findOne({ _id: req.params.photoId, isPublished: true }).select('_id');

  if (!photo) {
    throw createError('Photo not found', 404);
  }

  const rawRating = req.body.rating;
  const hasRatingInput = rawRating !== undefined && rawRating !== null;

  if (hasRatingInput && req.user.role !== 'consumer') {
    throw createError('Only consumers can add ratings', 403);
  }

  const rating = typeof rawRating === 'number' && rawRating >= 1 && rawRating <= 5 ? rawRating : undefined;

  if (hasRatingInput && rating === undefined) {
    throw createError('Rating must be between 1 and 5', 400);
  }

  if (rating !== undefined) {
    const existingRating = await Comment.findOne({
      photo: photo._id,
      author: req.user.id,
      rating: { $gte: 1, $lte: 5 },
    })
      .select('_id')
      .lean();

    if (existingRating) {
      throw createError('You can rate this photo only once', 409);
    }
  }

  const comment = await Comment.create({
    text,
    rating,
    photo: photo._id,
    author: req.user.id,
  });

  const populatedComment = await Comment.findById(comment._id).populate('author', 'username avatar').lean();

  await Promise.all([
    cacheService.invalidatePhotoInteractions(req.params.photoId),
    cacheService.invalidateAdminCaches(),
  ]);

  return res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: {
      comment: populatedComment,
    },
  });
});

/**
 * Returns paginated comments for a photo sorted newest first.
 */
export const getComments = asyncHandler(async (req: Request<PhotoCommentsParams, unknown, unknown, PaginationQuery>, res: Response) => {
  const photoId = req.params.photoId;
  const page = parsePaginationValue(req.query.page, 1);
  const limit = Math.min(parsePaginationValue(req.query.limit, 20), 50);
  const skip = (page - 1) * limit;
  const cacheKey = commentsCacheKey(photoId, page, limit);

  const cached = await getCache<CachedCommentsPayload>(cacheKey);
  const ratingSummary = await getRatingSummary(photoId);

  if (cached) {
    let userHasRated = false;
    let userRating: number | null = null;

    if (req.user?.id) {
      const rated = await Comment.findOne({
        photo: photoId,
        author: req.user.id,
        rating: { $gte: 1, $lte: 5 },
      })
        .select('rating')
        .lean();

      userHasRated = Boolean(rated);
      userRating = rated?.rating ?? null;
    }

    return res.status(200).json({
      success: true,
      message: 'Comments fetched successfully',
      fromCache: true,
      data: {
        comments: cached.comments,
        page: cached.page,
        limit: cached.limit,
        totalPages: cached.totalPages,
        total: cached.total,
        hasMore: cached.hasMore,
        averageRating: ratingSummary.averageRating,
        totalRatings: ratingSummary.totalRatings,
        distribution: ratingSummary.distribution,
        userHasRated,
        userRating,
      },
    });
  }

  const [comments, total] = await Promise.all([
    Comment.find({ photo: photoId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username avatar')
      .lean(),
    Comment.countDocuments({ photo: photoId }),
  ]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const hasMore = page < totalPages;

  await setCache(
    cacheKey,
    {
      comments: comments as unknown as Array<Record<string, unknown>>,
      page,
      limit,
      totalPages,
      total,
      hasMore,
      averageRating: ratingSummary.averageRating,
      totalRatings: ratingSummary.totalRatings,
    } satisfies CachedCommentsPayload,
    CACHE_TTL_SECONDS.COMMENTS,
  );

  let userHasRated = false;
  let userRating: number | null = null;

  if (req.user?.id) {
    const rated = await Comment.findOne({
      photo: photoId,
      author: req.user.id,
      rating: { $gte: 1, $lte: 5 },
    })
      .select('rating')
      .lean();

    userHasRated = Boolean(rated);
    userRating = rated?.rating ?? null;
  }

  return res.status(200).json({
    success: true,
    message: 'Comments fetched successfully',
    data: {
      comments,
      page,
      limit,
      totalPages,
      total,
      hasMore,
      averageRating: ratingSummary.averageRating,
      totalRatings: ratingSummary.totalRatings,
      distribution: ratingSummary.distribution,
      userHasRated,
      userRating,
    },
  });
});

/**
 * Deletes a comment by owner or by the photo creator.
 */
export const deleteComment = asyncHandler(async (req: Request<CommentParams>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const comment = await Comment.findById(req.params.id).select('author photo').lean();

  if (!comment) {
    throw createError('Comment not found', 404);
  }

  const isOwner = String(comment.author) === req.user.id;

  if (!isOwner) {
    const photo = await Photo.findById(comment.photo).select('creator').lean();

    if (!photo) {
      throw createError('Photo not found', 404);
    }

    const canManagePhotoComments = String(photo.creator) === req.user.id || req.user.role === 'admin';

    if (!canManagePhotoComments) {
      throw createError('You are not allowed to delete this comment', 403);
    }
  }

  await Comment.findByIdAndDelete(req.params.id);
  await Promise.all([
    cacheService.invalidatePhotoInteractions(String(comment.photo)),
    cacheService.invalidateAdminCaches(),
  ]);

  return res.status(200).json({
    success: true,
    message: 'Comment deleted successfully',
  });
});

/**
 * Returns rating average, count, and distribution for a photo.
 */
export const getPhotoRating = asyncHandler(async (req: Request<PhotoCommentsParams>, res: Response) => {
  const photo = await Photo.findOne({ _id: req.params.photoId, isPublished: true }).select('_id').lean();

  if (!photo) {
    throw createError('Photo not found', 404);
  }

  const ratingSummary = await getRatingSummary(req.params.photoId);

  return res.status(200).json({
    success: true,
    message: 'Photo rating fetched successfully',
    data: ratingSummary,
  });
});

import type { Request, Response } from 'express';

import Comment from '../models/Comment.model';
import Photo from '../models/Photo.model';
import type { AppError } from '../types/auth.types';
import asyncHandler from '../utils/asyncHandler';
import { deleteCachePattern } from '../utils/redis.utils';

type PhotoCommentsParams = {
  photoId: string;
};

type CreateCommentBody = {
  text?: string;
  rating?: number;
};

type PaginationQuery = {
  page?: string;
  limit?: string;
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

const invalidateCommentCaches = async (photoId: string): Promise<void> => {
  await Promise.allSettled([
    deleteCachePattern(`photos:detail:${photoId}*`),
    deleteCachePattern('photos:list:*'),
  ]);
};

/**
 * Returns paginated comments for a photo sorted newest first.
 */
export const getCommentsByPhoto = asyncHandler(async (req: Request<PhotoCommentsParams, unknown, unknown, PaginationQuery>, res: Response) => {
  const page = parsePaginationValue(req.query.page, 1);
  const limit = Math.min(parsePaginationValue(req.query.limit, 20), 50);
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ photo: req.params.photoId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username avatar')
      .lean(),
    Comment.countDocuments({ photo: req.params.photoId }),
  ]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return res.status(200).json({
    success: true,
    message: 'Comments fetched successfully',
    data: {
      comments,
      page,
      limit,
      totalPages,
      total,
      hasMore: page < totalPages,
    },
  });
});

/**
 * Creates a comment on a photo for authenticated users.
 */
export const createComment = asyncHandler(async (req: Request<PhotoCommentsParams, unknown, CreateCommentBody>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const text = req.body.text?.trim();

  if (!text) {
    throw createError('Comment text is required', 400);
  }

  const photo = await Photo.findOne({ _id: req.params.photoId, isPublished: true }).select('_id');

  if (!photo) {
    throw createError('Photo not found', 404);
  }

  const rating = typeof req.body.rating === 'number' && req.body.rating >= 1 && req.body.rating <= 5 ? req.body.rating : undefined;

  const comment = await Comment.create({
    text,
    rating,
    photo: photo._id,
    author: req.user.id,
  });

  const populatedComment = await Comment.findById(comment._id).populate('author', 'username avatar').lean();

+  await invalidateCommentCaches(req.params.photoId);

  return res.status(201).json({
    success: true,
    message: 'Comment added successfully',
    data: {
      comment: populatedComment,
    },
  });
});

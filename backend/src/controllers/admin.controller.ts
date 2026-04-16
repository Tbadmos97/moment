import type { Request, Response } from 'express';

import Comment from '../models/Comment.model';
import Photo from '../models/Photo.model';
import User from '../models/User.model';
import cacheService from '../services/cache.service';
import type { AppError } from '../types/auth.types';
import asyncHandler from '../utils/asyncHandler';
import {
  CACHE_KEY_FACTORIES,
  CACHE_TTL_SECONDS,
  getCache,
  setCache,
} from '../utils/redis.utils';

type RoleFilter = 'creator' | 'consumer' | 'admin' | 'all';

type UsersQuery = {
  page?: string;
  limit?: string;
  role?: RoleFilter;
  search?: string;
};

type PhotosQuery = {
  page?: string;
  limit?: string;
  search?: string;
  status?: 'published' | 'draft' | 'all';
};

type CommentsQuery = {
  page?: string;
  limit?: string;
  search?: string;
};

type UpdateRoleBody = {
  role: 'creator' | 'consumer' | 'admin';
};

type UpdateStatusBody = {
  isActive: boolean;
};

type PublishBody = {
  isPublished: boolean;
};

const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
};

const parsePagination = (pageRaw?: string, limitRaw?: string) => {
  const page = Math.max(1, Number.parseInt(pageRaw ?? '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(limitRaw ?? '20', 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const getAdminOverview = asyncHandler(async (_req: Request, res: Response) => {
  const cacheKey = CACHE_KEY_FACTORIES.adminOverview();
  const cached = await getCache<{
    users: { total: number; creators: number; consumers: number; admins: number; newToday: number };
    photos: { total: number; published: number; drafts: number; uploadedToday: number };
    comments: { total: number };
  }>(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: 'Admin overview fetched successfully',
      data: cached,
      fromCache: true,
    });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [totalUsers, totalCreators, totalConsumers, totalAdmins, totalPhotos, publishedPhotos, draftPhotos, totalComments, newUsersToday, uploadsToday] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'creator' }),
      User.countDocuments({ role: 'consumer' }),
      User.countDocuments({ role: 'admin' }),
      Photo.countDocuments(),
      Photo.countDocuments({ isPublished: true }),
      Photo.countDocuments({ isPublished: false }),
      Comment.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfDay } }),
      Photo.countDocuments({ createdAt: { $gte: startOfDay } }),
    ]);

  const payload = {
    users: {
      total: totalUsers,
      creators: totalCreators,
      consumers: totalConsumers,
      admins: totalAdmins,
      newToday: newUsersToday,
    },
    photos: {
      total: totalPhotos,
      published: publishedPhotos,
      drafts: draftPhotos,
      uploadedToday: uploadsToday,
    },
    comments: {
      total: totalComments,
    },
  };

  await setCache(cacheKey, payload, CACHE_TTL_SECONDS.CREATOR_DASHBOARD);

  return res.status(200).json({
    success: true,
    message: 'Admin overview fetched successfully',
    data: payload,
  });
});

export const getAdminUsers = asyncHandler(async (req: Request<unknown, unknown, unknown, UsersQuery>, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
  const role = req.query.role ?? 'all';
  const search = req.query.search?.trim().toLowerCase();
  const cacheKey = CACHE_KEY_FACTORIES.adminUsers(page, limit, role, search);
  const cached = await getCache<{
    users: unknown[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  }>(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: 'Admin user list fetched successfully',
      data: cached,
      fromCache: true,
    });
  }

  const filter: Record<string, unknown> = {};

  if (role !== 'all') {
    filter.role = role;
  }

  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('_id username email role isActive createdAt updatedAt avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const payload = {
    users,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: skip + users.length < total,
  };

  await setCache(cacheKey, payload, CACHE_TTL_SECONDS.ADMIN_LIST);

  return res.status(200).json({
    success: true,
    message: 'Admin user list fetched successfully',
    data: payload,
  });
});

export const updateUserRoleByAdmin = asyncHandler(
  async (req: Request<{ userId: string }, unknown, UpdateRoleBody>, res: Response) => {
    if (!req.user) {
      throw createError('Unauthorized', 401);
    }

    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['creator', 'consumer', 'admin'].includes(role)) {
      throw createError('Role must be one of creator, consumer, or admin', 422);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw createError('User not found', 404);
    }

    if (String(user._id) === req.user.id && role !== 'admin') {
      throw createError('You cannot remove your own admin role', 400);
    }

    user.role = role;
    await user.save();
    await Promise.all([
      cacheService.invalidateUserProfile(String(user._id)),
      cacheService.invalidateAdminCaches(),
    ]);

    return res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: {
          _id: String(user._id),
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  },
);

export const updateUserStatusByAdmin = asyncHandler(
  async (req: Request<{ userId: string }, unknown, UpdateStatusBody>, res: Response) => {
    if (!req.user) {
      throw createError('Unauthorized', 401);
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      throw createError('isActive must be boolean', 422);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw createError('User not found', 404);
    }

    if (String(user._id) === req.user.id && !isActive) {
      throw createError('You cannot deactivate your own account', 400);
    }

    user.isActive = isActive;
    await user.save();
    await Promise.all([
      cacheService.invalidateUserProfile(String(user._id)),
      cacheService.invalidateAdminCaches(),
    ]);

    return res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          _id: String(user._id),
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  },
);

export const getAdminPhotos = asyncHandler(async (req: Request<unknown, unknown, unknown, PhotosQuery>, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
  const search = req.query.search?.trim();
  const status = req.query.status ?? 'all';
  const cacheKey = CACHE_KEY_FACTORIES.adminPhotos(page, limit, status, search);
  const cached = await getCache<{
    photos: unknown[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  }>(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: 'Admin photo list fetched successfully',
      data: cached,
      fromCache: true,
    });
  }

  const filter: Record<string, unknown> = {};

  if (status === 'published') {
    filter.isPublished = true;
  } else if (status === 'draft') {
    filter.isPublished = false;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { caption: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const [photos, total] = await Promise.all([
    Photo.find(filter)
      .select('_id title caption imageUrl thumbnailUrl mimeType mediaType creator likesCount commentsCount isPublished createdAt')
      .populate('creator', 'username email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Photo.countDocuments(filter),
  ]);

  const payload = {
    photos,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: skip + photos.length < total,
  };

  await setCache(cacheKey, payload, CACHE_TTL_SECONDS.ADMIN_LIST);

  return res.status(200).json({
    success: true,
    message: 'Admin photo list fetched successfully',
    data: payload,
  });
});

export const setPhotoPublishStateByAdmin = asyncHandler(
  async (req: Request<{ photoId: string }, unknown, PublishBody>, res: Response) => {
    const { photoId } = req.params;
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
      throw createError('isPublished must be boolean', 422);
    }

    const photo = await Photo.findById(photoId);

    if (!photo) {
      throw createError('Photo not found', 404);
    }

    photo.isPublished = isPublished;
    await photo.save();
    await Promise.all([
      cacheService.invalidatePhotoDetailAndLists(String(photo._id)),
      cacheService.invalidateCreatorDashboard(String(photo.creator)),
      cacheService.invalidateAdminCaches(),
    ]);

    return res.status(200).json({
      success: true,
      message: `Photo ${isPublished ? 'published' : 'unpublished'} successfully`,
      data: {
        photo: {
          _id: String(photo._id),
          isPublished: photo.isPublished,
        },
      },
    });
  },
);

export const deletePhotoByAdmin = asyncHandler(async (req: Request<{ photoId: string }>, res: Response) => {
  const { photoId } = req.params;

  const photo = await Photo.findById(photoId);

  if (!photo) {
    throw createError('Photo not found', 404);
  }

  await photo.deleteOne();
  await Promise.all([
    cacheService.invalidatePhotoDetailAndLists(String(photo._id)),
    cacheService.invalidateCreatorDashboard(String(photo.creator)),
    cacheService.invalidateAdminCaches(),
  ]);

  return res.status(200).json({
    success: true,
    message: 'Photo deleted successfully',
  });
});

export const getAdminComments = asyncHandler(async (req: Request<unknown, unknown, unknown, CommentsQuery>, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query.page, req.query.limit);
  const search = req.query.search?.trim();
  const cacheKey = CACHE_KEY_FACTORIES.adminComments(page, limit, search);
  const cached = await getCache<{
    comments: unknown[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  }>(cacheKey);

  if (cached) {
    return res.status(200).json({
      success: true,
      message: 'Admin comment list fetched successfully',
      data: cached,
      fromCache: true,
    });
  }

  const filter: Record<string, unknown> = {};

  if (search) {
    filter.text = { $regex: search, $options: 'i' };
  }

  const [comments, total] = await Promise.all([
    Comment.find(filter)
      .select('_id text rating author photo createdAt')
      .populate('author', 'username email role')
      .populate('photo', 'title thumbnailUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Comment.countDocuments(filter),
  ]);

  const payload = {
    comments,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    hasMore: skip + comments.length < total,
  };

  await setCache(cacheKey, payload, CACHE_TTL_SECONDS.ADMIN_LIST);

  return res.status(200).json({
    success: true,
    message: 'Admin comment list fetched successfully',
    data: payload,
  });
});

export const deleteCommentByAdmin = asyncHandler(async (req: Request<{ commentId: string }>, res: Response) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw createError('Comment not found', 404);
  }

  await comment.deleteOne();
  await Promise.all([
    cacheService.invalidatePhotoInteractions(String(comment.photo)),
    cacheService.invalidateAdminCaches(),
  ]);

  return res.status(200).json({
    success: true,
    message: 'Comment deleted successfully',
  });
});

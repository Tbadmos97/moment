import type { Request, Response } from 'express';

import User from '../models/User.model';
import asyncHandler from '../utils/asyncHandler';
import {
  CACHE_KEY_FACTORIES,
  CACHE_TTL_SECONDS,
  getCache,
  setCache,
} from '../utils/redis.utils';

/**
 * Checks if a username is available for new registrations.
 */
export const checkUsernameAvailability = asyncHandler(
  async (req: Request<unknown, unknown, unknown, { username?: string }>, res: Response) => {
    const username = req.query.username?.trim().toLowerCase();

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username query parameter is required',
      });
    }

    const cacheKey = CACHE_KEY_FACTORIES.usernameCheck(username);
    const cached = await getCache<{ available: boolean }>(cacheKey);

    if (cached) {
      return res.status(200).json({
        success: true,
        message: cached.available ? 'Username is available' : 'Username is already taken',
        fromCache: true,
        data: cached,
      });
    }

    const existing = await User.exists({ username });
    const payload = {
      available: !existing,
    };

    await setCache(cacheKey, payload, CACHE_TTL_SECONDS.USERNAME_CHECK);

    return res.status(200).json({
      success: true,
      message: payload.available ? 'Username is available' : 'Username is already taken',
      data: payload,
    });
  },
);

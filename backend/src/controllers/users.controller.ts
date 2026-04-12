import type { Request, Response } from 'express';

import User from '../models/User.model';
import asyncHandler from '../utils/asyncHandler';

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

    const existing = await User.exists({ username });

    return res.status(200).json({
      success: true,
      message: existing ? 'Username is already taken' : 'Username is available',
      data: {
        available: !existing,
      },
    });
  },
);

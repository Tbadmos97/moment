import type { Request, Response } from 'express';

import User from '../models/User.model';
import type { AppError } from '../types/auth.types';
import asyncHandler from '../utils/asyncHandler';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.utils';

interface RegisterBody {
  username: string;
  email: string;
  password: string;
  role?: 'creator' | 'consumer';
  creatorAccessCode?: string;
  avatar?: string;
  bio?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

interface LogoutBody {
  refreshToken: string;
}

interface BecomeCreatorBody {
  creatorAccessCode: string;
}

const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
};

const normalizeTokens = (tokens: string[]): string[] => {
  if (tokens.length <= 5) {
    return tokens;
  }

  return tokens.slice(tokens.length - 5);
};

const toPublicUser = (user: {
  _id: unknown;
  username: string;
  email: string;
  role: string;
  avatar?: string | null;
}) => {
  return {
    _id: String(user._id),
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? undefined,
  };
};

const issueTokens = (userId: string, role: 'creator' | 'consumer' | 'admin') => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId);

  return {
    accessToken,
    refreshToken,
  };
};

/**
 * Registers a new consumer user and returns an authenticated session.
 */
export const register = asyncHandler(async (req: Request<unknown, unknown, RegisterBody>, res: Response) => {
  const { username, email, password, avatar, bio, role, creatorAccessCode } = req.body;

  const requestedRole: 'creator' | 'consumer' = role === 'creator' ? 'creator' : 'consumer';

  if (requestedRole === 'creator') {
    const creatorSignupSecret = process.env.CREATOR_SIGNUP_SECRET?.trim();

    if (!creatorSignupSecret) {
      throw createError('Creator self-signup is currently unavailable', 403);
    }

    if (!creatorAccessCode || creatorAccessCode.trim() !== creatorSignupSecret) {
      throw createError('Invalid creator access code', 403);
    }
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  const [usernameExists, emailExists] = await Promise.all([
    User.exists({ username: normalizedUsername }),
    User.exists({ email: normalizedEmail }),
  ]);

  if (usernameExists) {
    throw createError('Username is already taken', 409);
  }

  if (emailExists) {
    throw createError('Email is already registered', 409);
  }

  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    role: requestedRole,
    avatar,
    bio,
  });

  const { accessToken, refreshToken } = issueTokens(String(user._id), user.role);

  user.refreshTokens = normalizeTokens([...user.refreshTokens, refreshToken]);
  await user.save();

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Authenticates a user using email and password credentials.
 */
export const login = asyncHandler(async (req: Request<unknown, unknown, LoginBody>, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw createError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw createError('Account is deactivated', 403);
  }

  const { accessToken, refreshToken } = issueTokens(String(user._id), user.role);

  user.refreshTokens = normalizeTokens([...user.refreshTokens, refreshToken]);
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Rotates refresh token and issues a new access token pair.
 */
export const refreshToken = asyncHandler(async (req: Request<unknown, unknown, RefreshBody>, res: Response) => {
  const { refreshToken: oldRefreshToken } = req.body;

  const payload = verifyRefreshToken(oldRefreshToken);
  const user = await User.findById(payload.userId);

  if (!user || !user.isActive) {
    throw createError('Invalid session', 401);
  }

  if (!user.refreshTokens.includes(oldRefreshToken)) {
    throw createError('Refresh token is not recognized', 401);
  }

  const { accessToken, refreshToken: newRefreshToken } = issueTokens(String(user._id), user.role);

  user.refreshTokens = normalizeTokens(
    user.refreshTokens.filter((token) => token !== oldRefreshToken).concat(newRefreshToken),
  );
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: {
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});

/**
 * Revokes a refresh token from the authenticated user.
 */
export const logout = asyncHandler(async (req: Request<unknown, unknown, LogoutBody>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const { refreshToken: tokenToRevoke } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw createError('User not found', 404);
  }

  user.refreshTokens = user.refreshTokens.filter((token) => token !== tokenToRevoke);
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * Returns profile details for the currently authenticated user.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    throw createError('User not found', 404);
  }

  return res.status(200).json({
    success: true,
    message: 'User profile fetched successfully',
    data: {
      user: toPublicUser(user),
    },
  });
});

/**
 * Upgrades an authenticated consumer account to creator after access-code verification.
 */
export const becomeCreator = asyncHandler(async (req: Request<unknown, unknown, BecomeCreatorBody>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const creatorSignupSecret = process.env.CREATOR_SIGNUP_SECRET?.trim();

  if (!creatorSignupSecret) {
    throw createError('Creator upgrade is currently unavailable', 403);
  }

  const submittedCode = req.body.creatorAccessCode?.trim();

  if (!submittedCode || submittedCode !== creatorSignupSecret) {
    throw createError('Invalid creator access code', 403);
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    throw createError('User not found', 404);
  }

  if (!user.isActive) {
    throw createError('Account is deactivated', 403);
  }

  if (user.role === 'creator' || user.role === 'admin') {
    const { accessToken, refreshToken } = issueTokens(String(user._id), user.role);
    user.refreshTokens = normalizeTokens([...user.refreshTokens, refreshToken]);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Account is already creator-enabled',
      data: {
        user: toPublicUser(user),
        accessToken,
        refreshToken,
      },
    });
  }

  user.role = 'creator';

  const { accessToken, refreshToken } = issueTokens(String(user._id), user.role);
  user.refreshTokens = normalizeTokens([...user.refreshTokens, refreshToken]);
  await user.save();

  return res.status(200).json({
    success: true,
    message: 'Account upgraded to creator',
    data: {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Allows an admin to create a creator account without issuing login tokens.
 */
export const adminCreateCreator = asyncHandler(async (req: Request<unknown, unknown, RegisterBody>, res: Response) => {
  const { username, email, password, avatar, bio } = req.body;

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  const [usernameExists, emailExists] = await Promise.all([
    User.exists({ username: normalizedUsername }),
    User.exists({ email: normalizedEmail }),
  ]);

  if (usernameExists) {
    throw createError('Username is already taken', 409);
  }

  if (emailExists) {
    throw createError('Email is already registered', 409);
  }

  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    role: 'creator',
    avatar,
    bio,
  });

  return res.status(201).json({
    success: true,
    message: 'Creator account created',
    data: {
      user: toPublicUser(user),
    },
  });
});

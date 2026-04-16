import type { Request, Response } from 'express';

import User from '../models/User.model';
import cacheService from '../services/cache.service';
import {
  getSessionMetadata,
  issueSessionTokens,
  listActiveSessions,
  revokeSessionById,
  revokeSessionByToken,
  rotateSessionTokens,
} from '../services/identity.service';
import type { AppError } from '../types/auth.types';
import asyncHandler from '../utils/asyncHandler';
import {
  verifyRefreshToken,
} from '../utils/jwt.utils';
import {
  CACHE_KEY_FACTORIES,
  CACHE_TTL_SECONDS,
  getCache,
  setCache,
} from '../utils/redis.utils';

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

interface SetupAdminBody {
  username: string;
  email: string;
  password: string;
  adminSetupSecret: string;
}

type SessionParams = {
  tokenId: string;
};

const createError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  return error;
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

  const { accessToken, refreshToken } = issueSessionTokens(user, getSessionMetadata(req));
  await user.save();
  await Promise.all([
    cacheService.invalidateUsernameCheck(),
    cacheService.invalidateUserProfile(String(user._id)),
    cacheService.invalidateAdminCaches(),
  ]);

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

  const { accessToken, refreshToken } = issueSessionTokens(user, getSessionMetadata(req));
  await user.save();
  await cacheService.invalidateUserProfile(String(user._id));

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

  const { accessToken, refreshToken: newRefreshToken } = rotateSessionTokens(user, oldRefreshToken, getSessionMetadata(req));
  await user.save();
  await cacheService.invalidateUserProfile(String(user._id));

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

  revokeSessionByToken(user, tokenToRevoke);
  await user.save();
  await cacheService.invalidateUserProfile(String(user._id));

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

  const cacheKey = CACHE_KEY_FACTORIES.userProfile(req.user.id);
  const cached = await getCache<{ user: ReturnType<typeof toPublicUser> }>(cacheKey);

  if (cached?.user) {
    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      data: cached,
      fromCache: true,
    });
  }

  const user = await User.findById(req.user.id).select('_id username email role avatar').lean();

  if (!user) {
    throw createError('User not found', 404);
  }

  const payload = {
    user: toPublicUser(user),
  };

  await setCache(cacheKey, payload, CACHE_TTL_SECONDS.USER_PROFILE);

  return res.status(200).json({
    success: true,
    message: 'User profile fetched successfully',
    data: payload,
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
    const { accessToken, refreshToken } = issueSessionTokens(user, getSessionMetadata(req));
    await user.save();
    await cacheService.invalidateUserProfile(String(user._id));

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

  const { accessToken, refreshToken } = issueSessionTokens(user, getSessionMetadata(req));
  await user.save();
  await Promise.all([
    cacheService.invalidateUserProfile(String(user._id)),
    cacheService.invalidateAdminCaches(),
  ]);

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

  await Promise.all([
    cacheService.invalidateUsernameCheck(),
    cacheService.invalidateAdminCaches(),
  ]);

  return res.status(201).json({
    success: true,
    message: 'Creator account created',
    data: {
      user: toPublicUser(user),
    },
  });
});

/**
 * Creates the very first admin account using ADMIN_SETUP_SECRET.
 */
export const setupInitialAdmin = asyncHandler(async (req: Request<unknown, unknown, SetupAdminBody>, res: Response) => {
  const { username, email, password, adminSetupSecret } = req.body;

  const configuredSecret = process.env.ADMIN_SETUP_SECRET?.trim();

  if (!configuredSecret) {
    throw createError('Admin setup is currently disabled', 403);
  }

  if (!adminSetupSecret || adminSetupSecret.trim() !== configuredSecret) {
    throw createError('Invalid admin setup secret', 403);
  }

  const adminExists = await User.exists({ role: 'admin' });

  if (adminExists) {
    throw createError('Initial admin has already been configured', 409);
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
    role: 'admin',
  });

  const { accessToken, refreshToken } = issueSessionTokens(user, getSessionMetadata(req));
  await user.save();
  await Promise.all([
    cacheService.invalidateUsernameCheck(),
    cacheService.invalidateUserProfile(String(user._id)),
    cacheService.invalidateAdminCaches(),
  ]);

  return res.status(201).json({
    success: true,
    message: 'Initial admin created successfully',
    data: {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
    },
  });
});

/**
 * Lists active refresh sessions for the authenticated user.
 */
export const getSessions = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const user = await User.findById(req.user.id).select('_id refreshTokens refreshSessions');

  if (!user) {
    throw createError('User not found', 404);
  }

  return res.status(200).json({
    success: true,
    message: 'Active sessions fetched successfully',
    data: {
      sessions: listActiveSessions(user),
    },
  });
});

/**
 * Revokes one specific refresh session by tokenId.
 */
export const revokeSession = asyncHandler(async (req: Request<SessionParams>, res: Response) => {
  if (!req.user) {
    throw createError('Unauthorized', 401);
  }

  const user = await User.findById(req.user.id).select('_id refreshTokens refreshSessions');

  if (!user) {
    throw createError('User not found', 404);
  }

  const revoked = revokeSessionById(user, req.params.tokenId);

  if (!revoked) {
    throw createError('Session not found', 404);
  }

  await user.save();
  await cacheService.invalidateUserProfile(String(user._id));

  return res.status(200).json({
    success: true,
    message: 'Session revoked successfully',
  });
});

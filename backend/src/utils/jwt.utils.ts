import jwt from 'jsonwebtoken';

import type { AuthJwtPayload, RefreshJwtPayload, UserRole } from '../types/auth.types';

const ACCESS_EXPIRES: jwt.SignOptions['expiresIn'] =
  (process.env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn']) ?? '15m';
const REFRESH_EXPIRES: jwt.SignOptions['expiresIn'] =
  (process.env.JWT_REFRESH_EXPIRES as jwt.SignOptions['expiresIn']) ?? '7d';

const ensureSecret = (secret: string | undefined, variableName: string): string => {
  if (!secret) {
    throw new Error(`${variableName} is required`);
  }

  return secret;
};

/**
 * Creates a short-lived JWT used to authenticate API requests.
 */
export const generateAccessToken = (userId: string, role: UserRole): string => {
  const secret = ensureSecret(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET');

  return jwt.sign({ userId, role } satisfies AuthJwtPayload, secret, {
    expiresIn: ACCESS_EXPIRES,
  });
};

/**
 * Creates a long-lived JWT used to rotate access tokens.
 */
export const generateRefreshToken = (userId: string): string => {
  const secret = ensureSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');

  return jwt.sign({ userId } satisfies RefreshJwtPayload, secret, {
    expiresIn: REFRESH_EXPIRES,
  });
};

/**
 * Verifies an access token and returns its normalized payload.
 */
export const verifyAccessToken = (token: string): AuthJwtPayload => {
  const secret = ensureSecret(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET');
  const decoded = jwt.verify(token, secret);

  if (typeof decoded === 'string' || !decoded.userId || !decoded.role) {
    throw new Error('Invalid access token payload');
  }

  return {
    userId: String(decoded.userId),
    role: decoded.role as UserRole,
  };
};

/**
 * Verifies a refresh token and returns its normalized payload.
 */
export const verifyRefreshToken = (token: string): RefreshJwtPayload => {
  const secret = ensureSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
  const decoded = jwt.verify(token, secret);

  if (typeof decoded === 'string' || !decoded.userId) {
    throw new Error('Invalid refresh token payload');
  }

  return {
    userId: String(decoded.userId),
  };
};

import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { AppError, AuthenticatedUser, UserRole } from '../types/auth.types';
import { verifyAccessToken } from '../utils/jwt.utils';

const parseBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

const unauthorizedError = (message: string): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = 401;
  return error;
};

/**
 * Requires a valid access token and attaches user identity to request context.
 */
export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const token = parseBearerToken(req.headers.authorization);

  if (!token) {
    next(unauthorizedError('Access token is required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      role: payload.role,
    } satisfies AuthenticatedUser;

    next();
  } catch {
    next(unauthorizedError('Invalid or expired access token'));
  }
};

/**
 * Authorizes authenticated users against a list of allowed roles.
 */
export const requireRole = (...roles: UserRole[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorizedError('Authentication is required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      const error = new Error('Insufficient permissions') as AppError;
      error.statusCode = 403;
      next(error);
      return;
    }

    next();
  };
};

/**
 * Attempts to parse access token and attach user context without failing public requests.
 */
export const optionalAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const token = parseBearerToken(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      role: payload.role,
    } satisfies AuthenticatedUser;
  } catch {
    req.user = undefined;
  }

  next();
};

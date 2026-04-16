import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
};

const isProduction = process.env.NODE_ENV === 'production';
const authWindowMs = parseInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const authMax = parseInteger(process.env.AUTH_RATE_LIMIT_MAX, isProduction ? 5 : 100);

const normalizeUserKey = (req: Request): string => {
  if (req.user?.id) {
    return req.user.id;
  }

  return ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'anonymous');
};

export const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  // Successful auth calls should not consume the brute-force budget.
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: normalizeUserKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Upload limit exceeded. Try again in an hour.',
  },
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

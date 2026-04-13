import { body, type ValidationChain, validationResult } from 'express-validator';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Returns 422 responses for express-validator failures in a normalized shape.
 */
export const validateRequest: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    next();
    return;
  }

  res.status(422).json({
    success: false,
    message: 'Validation failed',
    errors: errors.array().map((error) => ({
      field: 'path' in error ? error.path : 'unknown',
      message: error.msg,
    })),
  });
};

export const registerUserValidation: ValidationChain[] = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Username can contain lowercase letters, numbers, and underscores only'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/)
    .withMessage('Password must include one uppercase letter, one number, and one special character'),
  body('bio').optional().trim().isLength({ max: 160 }).withMessage('Bio must be at most 160 characters'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL'),
];

export const loginUserValidation: ValidationChain[] = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const refreshTokenValidation: ValidationChain[] = [
  body('refreshToken').trim().notEmpty().withMessage('refreshToken is required'),
];

export const logoutValidation: ValidationChain[] = [
  body('refreshToken').trim().notEmpty().withMessage('refreshToken is required'),
];

export const createPhotoValidation: ValidationChain[] = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }).withMessage('Title max length is 100'),
  body('caption').optional().trim().isLength({ max: 500 }).withMessage('Caption max length is 500'),
  body('locationName').optional().trim().isLength({ max: 120 }).withMessage('Location name max length is 120'),
  body('location.name').optional().trim().isLength({ max: 120 }).withMessage('Location name max length is 120'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array [lng, lat] with 2 values'),
  body('location.coordinates.*').optional().isFloat().withMessage('Coordinates must be numbers'),
  body('people')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.length <= 10;
      }

      if (typeof value === 'string') {
        if (value.trim().startsWith('[')) {
          const parsed = JSON.parse(value) as string[];
          return Array.isArray(parsed) && parsed.length <= 10;
        }

        return value.split(',').filter(Boolean).length <= 10;
      }

      return false;
    })
    .withMessage('People supports up to 10 names'),
  body('tags')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.length <= 10;
      }

      if (typeof value === 'string') {
        if (value.trim().startsWith('[')) {
          const parsed = JSON.parse(value) as string[];
          return Array.isArray(parsed) && parsed.length <= 10;
        }

        return value.split(',').filter(Boolean).length <= 10;
      }

      return false;
    })
    .withMessage('Tags supports up to 10 values'),
];

export const updatePhotoValidation: ValidationChain[] = [
  body('title').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Title must be between 1 and 100 characters'),
  body('caption').optional().trim().isLength({ max: 500 }).withMessage('Caption max length is 500'),
  body('locationName').optional().trim().isLength({ max: 120 }).withMessage('Location name max length is 120'),
  body('location.name').optional().trim().isLength({ max: 120 }).withMessage('Location name max length is 120'),
  body('location.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array [lng, lat] with 2 values'),
  body('location.coordinates.*').optional().isFloat().withMessage('Coordinates must be numbers'),
  body('people')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.length <= 10;
      }

      if (typeof value === 'string') {
        if (value.trim().startsWith('[')) {
          const parsed = JSON.parse(value) as string[];
          return Array.isArray(parsed) && parsed.length <= 10;
        }

        return value.split(',').filter(Boolean).length <= 10;
      }

      return false;
    })
    .withMessage('People supports up to 10 names'),
  body('tags')
    .optional()
    .custom((value) => {
      if (Array.isArray(value)) {
        return value.length <= 10;
      }

      if (typeof value === 'string') {
        if (value.trim().startsWith('[')) {
          const parsed = JSON.parse(value) as string[];
          return Array.isArray(parsed) && parsed.length <= 10;
        }

        return value.split(',').filter(Boolean).length <= 10;
      }

      return false;
    })
    .withMessage('Tags supports up to 10 values'),
  body('isPublished').optional().isBoolean().withMessage('isPublished must be boolean'),
];

export const createCommentValidation: ValidationChain[] = [
  body('text').trim().isLength({ min: 1, max: 500 }).withMessage('Comment text must be between 1 and 500 characters'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
];

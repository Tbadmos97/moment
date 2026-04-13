import { Router } from 'express';

import { deletePhoto, updatePhoto, uploadPhoto } from '../controllers/photo.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { uploadLimiter } from '../middleware/rateLimit.middleware';
import { uploadSingle } from '../middleware/upload.middleware';
import { createPhotoValidation, updatePhotoValidation, validateRequest } from '../middleware/validate.middleware';

const router = Router();

router.post('/', authenticate, requireRole('creator'), uploadLimiter, uploadSingle, createPhotoValidation, validateRequest, uploadPhoto);
router.patch('/:id', authenticate, requireRole('creator'), updatePhotoValidation, validateRequest, updatePhoto);
router.delete('/:id', authenticate, requireRole('creator'), deletePhoto);

router.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Photo routes are available',
  });
});

export default router;

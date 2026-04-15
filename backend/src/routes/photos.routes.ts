import { Router } from 'express';

import {
  deletePhoto,
  getPhotoById,
  getPhotos,
  getPhotosByCreator,
  getTopViewedPhotos,
  getTrendingTags,
  likePhoto,
  unlikePhoto,
  updatePhoto,
  uploadPhoto,
} from '../controllers/photo.controller';
import {
  createComment,
  getComments,
  getPhotoRating,
} from '../controllers/comment.controller';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.middleware';
import { uploadLimiter } from '../middleware/rateLimit.middleware';
import { uploadSingle } from '../middleware/upload.middleware';
import { createPhotoValidation, updatePhotoValidation, validateRequest } from '../middleware/validate.middleware';

const router = Router();

router.get('/', optionalAuth, getPhotos);
router.get('/trending-tags', getTrendingTags);
router.get('/top-viewed', getTopViewedPhotos);
router.get('/creator/:userId', getPhotosByCreator);
router.get('/:photoId/comments', optionalAuth, getComments);
router.post('/:photoId/comments', authenticate, createComment);
router.get('/:photoId/rating', getPhotoRating);
router.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Photo routes are available',
  });
});
router.get('/:id', optionalAuth, getPhotoById);
router.post('/:id/like', authenticate, likePhoto);
router.delete('/:id/like', authenticate, unlikePhoto);

router.post('/', authenticate, requireRole('creator'), uploadLimiter, uploadSingle, createPhotoValidation, validateRequest, uploadPhoto);
router.patch('/:id', authenticate, requireRole('creator'), updatePhotoValidation, validateRequest, updatePhoto);
router.delete('/:id', authenticate, requireRole('creator'), deletePhoto);

export default router;

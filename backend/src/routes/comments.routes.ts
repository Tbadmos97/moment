import { Router } from 'express';

import { createComment, getCommentsByPhoto } from '../controllers/comment.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/photo/:photoId', optionalAuth, getCommentsByPhoto);
router.post('/photo/:photoId', authenticate, createComment);

router.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Comment routes are available',
  });
});

export default router;

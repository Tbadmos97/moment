import { Router } from 'express';

import { deleteComment } from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.delete('/:id', authenticate, deleteComment);

router.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Comment routes are available',
  });
});

export default router;

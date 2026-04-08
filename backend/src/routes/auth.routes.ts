import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Auth routes are available',
  });
});

export default router;

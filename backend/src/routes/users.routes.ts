import { Router } from 'express';

import { checkUsernameAvailability } from '../controllers/users.controller';

const router = Router();

router.get('/check-username', checkUsernameAvailability);

router.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'User routes are available',
  });
});

export default router;

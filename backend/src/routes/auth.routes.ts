import { Router } from 'express';

import {
  becomeCreator,
  adminCreateCreator,
  getMe,
  login,
  logout,
  refreshToken,
  register,
  setupInitialAdmin,
} from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import {
  loginUserValidation,
  becomeCreatorValidation,
  setupAdminValidation,
  logoutValidation,
  refreshTokenValidation,
  registerUserValidation,
  validateRequest,
} from '../middleware/validate.middleware';

const router = Router();

router.post('/register', authLimiter, registerUserValidation, validateRequest, register);
router.post('/setup-admin', authLimiter, setupAdminValidation, validateRequest, setupInitialAdmin);
router.post('/login', authLimiter, loginUserValidation, validateRequest, login);
router.post('/refresh', refreshTokenValidation, validateRequest, refreshToken);
router.post('/logout', authenticate, logoutValidation, validateRequest, logout);
router.get('/me', authenticate, getMe);
router.post('/become-creator', authenticate, becomeCreatorValidation, validateRequest, becomeCreator);

router.post(
  '/admin/create-creator',
  authenticate,
  requireRole('admin'),
  registerUserValidation,
  validateRequest,
  adminCreateCreator,
);

export default router;

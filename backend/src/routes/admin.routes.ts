import { Router } from 'express';

import {
  deleteCommentByAdmin,
  deletePhotoByAdmin,
  getAdminComments,
  getAdminOverview,
  getAdminPhotos,
  getAdminUsers,
  setPhotoPublishStateByAdmin,
  updateUserRoleByAdmin,
  updateUserStatusByAdmin,
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Admin routes are available',
  });
});

router.get('/overview', getAdminOverview);

router.get('/users', getAdminUsers);
router.patch('/users/:userId/role', updateUserRoleByAdmin);
router.patch('/users/:userId/status', updateUserStatusByAdmin);

router.get('/photos', getAdminPhotos);
router.patch('/photos/:photoId/publish', setPhotoPublishStateByAdmin);
router.delete('/photos/:photoId', deletePhotoByAdmin);

router.get('/comments', getAdminComments);
router.delete('/comments/:commentId', deleteCommentByAdmin);

export default router;

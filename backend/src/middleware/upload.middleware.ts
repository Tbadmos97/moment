import multer, { type FileFilterCallback } from 'multer';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const fileFilter = (_req: Express.Request, file: Express.Multer.File, callback: FileFilterCallback): void => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new Error('Only JPEG, PNG, and WEBP images are allowed'));
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

export const uploadSingle = upload.single('image');
export const uploadMultiple = upload.array('image', 5);

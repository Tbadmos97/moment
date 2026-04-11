import compression from 'compression';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { generalLimiter } from './middleware/rateLimit.middleware';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import commentsRoutes from './routes/comments.routes';
import photosRoutes from './routes/photos.routes';
import usersRoutes from './routes/users.routes';

type ApiError = Error & {
  statusCode?: number;
  errors?: unknown[];
};

/**
 * Configures the MOMENT Express application with security, logging, and API route wiring.
 */
const app = express();

const frontendOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: frontendOrigins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);

app.get('/api/health', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'MOMENT API is healthy',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((error: ApiError, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = error.statusCode ?? 500;
  const message = error.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(Array.isArray(error.errors) ? { errors: error.errors } : {}),
  });
});

export default app;

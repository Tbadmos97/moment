import dotenv from 'dotenv';
import mongoose from 'mongoose';

import app from './app';

dotenv.config();

const PORT = Number(process.env.PORT ?? 5000);
const MONGODB_URI = process.env.MONGODB_URI;
const MAX_RETRIES = 3;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

/**
 * Delays execution for retry backoff.
 */
const wait = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * Connects to MongoDB with bounded retry attempts.
 */
const connectWithRetry = async (attempt = 1): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: IS_PRODUCTION ? 100 : 10,
      minPoolSize: IS_PRODUCTION ? 5 : 1,
    });
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw error;
    }

    // eslint-disable-next-line no-console
    console.error(`MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES})`);
    await wait(2000);
    await connectWithRetry(attempt + 1);
  }
};

/**
 * Starts the HTTP server and registers graceful shutdown handlers.
 */
const startServer = async (): Promise<void> => {
  await connectWithRetry();

  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`MOMENT backend running on port ${PORT}`);
  });

  const gracefulShutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      await mongoose.disconnect();
      // eslint-disable-next-line no-console
      console.log('HTTP server closed and MongoDB disconnected');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });
};

void startServer().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error);
  process.exit(1);
});

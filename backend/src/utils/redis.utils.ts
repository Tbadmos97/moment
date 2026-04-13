import { Redis } from '@upstash/redis';

const createRedisClient = (): Redis | null => {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return null;
  }

  return new Redis({
    url: redisUrl,
    token: redisToken,
  });
};

const redis = createRedisClient();

export const CACHE_KEYS = {
  PHOTOS_LIST: 'photos:list',
  PHOTO_DETAIL: 'photos:detail',
  USER_PROFILE: 'user:profile',
} as const;

/**
 * Fetches cached JSON and returns a typed object.
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!redis) {
    return null;
  }

  const value = await redis.get<string>(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    await redis.del(key);
    return null;
  }
};

/**
 * Persists a JSON value with TTL in seconds.
 */
export const setCache = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  if (!redis) {
    return;
  }

  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
};

/**
 * Deletes a single cache key.
 */
export const deleteCache = async (key: string): Promise<void> => {
  if (!redis) {
    return;
  }

  await redis.del(key);
};

/**
 * Deletes keys matching a pattern using SCAN pagination.
 */
export const deleteCachePattern = async (pattern: string): Promise<number> => {
  if (!redis) {
    return 0;
  }

  let cursor = '0';
  let deleted = 0;

  do {
    const scanResult = (await redis.scan(cursor, { match: pattern, count: 100 })) as [string, string[]];
    cursor = scanResult[0] ?? '0';
    const keys = scanResult[1] ?? [];

    if (keys.length > 0) {
      deleted += keys.length;
      await redis.del(...keys);
    }
  } while (cursor !== '0');

  return deleted;
};

export default redis;

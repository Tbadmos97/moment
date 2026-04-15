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
  CREATOR_PHOTOS: 'photos:creator',
  TRENDING_TAGS: 'photos:trending-tags',
  TOP_VIEWED: 'photos:top-viewed',
  COMMENTS: 'photos:comments',
  RATING_SUMMARY: 'photos:rating',
  USER_PROFILE: 'user:profile',
  USERNAME_CHECK: 'users:username-check',
  ADMIN_OVERVIEW: 'admin:overview',
  ADMIN_USERS: 'admin:users',
  ADMIN_PHOTOS: 'admin:photos',
  ADMIN_COMMENTS: 'admin:comments',
} as const;

export const CACHE_TTL_SECONDS = {
  PHOTOS_LIST: 60,
  PHOTO_DETAIL: 120,
  TRENDING_TAGS: 300,
  CREATOR_DASHBOARD: 120,
  USER_PROFILE: 180,
  COMMENTS: 30,
  RATING_SUMMARY: 60,
  TOP_VIEWED: 120,
  USERNAME_CHECK: 180,
  ADMIN_LIST: 60,
} as const;

export const CACHE_KEY_FACTORIES = {
  photosList: (page: number, limit: number, sort: string, tag?: string, search?: string): string =>
    `${CACHE_KEYS.PHOTOS_LIST}:${page}:${limit}:${sort}:${tag ?? ''}:${search ?? ''}`,
  photoDetail: (photoId: string): string => `${CACHE_KEYS.PHOTO_DETAIL}:${photoId}`,
  creatorPhotos: (creatorId: string, page: number, limit: number): string =>
    `${CACHE_KEYS.CREATOR_PHOTOS}:${creatorId}:${page}:${limit}`,
  trendingTags: (): string => CACHE_KEYS.TRENDING_TAGS,
  topViewedPhotos: (limit: number): string => `${CACHE_KEYS.TOP_VIEWED}:${limit}`,
  comments: (photoId: string, page: number, limit: number): string => `${CACHE_KEYS.COMMENTS}:${photoId}:${page}:${limit}`,
  ratingSummary: (photoId: string): string => `${CACHE_KEYS.RATING_SUMMARY}:${photoId}`,
  userProfile: (userId: string): string => `${CACHE_KEYS.USER_PROFILE}:${userId}`,
  usernameCheck: (username: string): string => `${CACHE_KEYS.USERNAME_CHECK}:${username}`,
  adminOverview: (): string => CACHE_KEYS.ADMIN_OVERVIEW,
  adminUsers: (page: number, limit: number, role: string, search?: string): string =>
    `${CACHE_KEYS.ADMIN_USERS}:${page}:${limit}:${role}:${search ?? ''}`,
  adminPhotos: (page: number, limit: number, status: string, search?: string): string =>
    `${CACHE_KEYS.ADMIN_PHOTOS}:${page}:${limit}:${status}:${search ?? ''}`,
  adminComments: (page: number, limit: number, search?: string): string =>
    `${CACHE_KEYS.ADMIN_COMMENTS}:${page}:${limit}:${search ?? ''}`,
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

import { CACHE_KEYS, deleteCache, deleteCachePattern } from '../utils/redis.utils';

/**
 * Centralized cache invalidation helpers for write operations.
 */
export const cacheService = {
  invalidatePhotosList: async (): Promise<void> => {
    await deleteCachePattern(`${CACHE_KEYS.PHOTOS_LIST}:*`);
  },

  invalidatePhotoDetail: async (photoId: string): Promise<void> => {
    await deleteCache(`${CACHE_KEYS.PHOTO_DETAIL}:${photoId}`);
  },

  invalidatePhotoDetailAndLists: async (photoId: string): Promise<void> => {
    await Promise.all([
      deleteCache(`${CACHE_KEYS.PHOTO_DETAIL}:${photoId}`),
      deleteCachePattern(`${CACHE_KEYS.PHOTOS_LIST}:*`),
      deleteCachePattern(`${CACHE_KEYS.CREATOR_PHOTOS}:*`),
      deleteCachePattern(`${CACHE_KEYS.TOP_VIEWED}:*`),
    ]);
  },

  invalidatePhotoInteractions: async (photoId: string): Promise<void> => {
    await Promise.all([
      deleteCache(`${CACHE_KEYS.PHOTO_DETAIL}:${photoId}`),
      deleteCachePattern(`${CACHE_KEYS.COMMENTS}:${photoId}:*`),
      deleteCache(`${CACHE_KEYS.RATING_SUMMARY}:${photoId}`),
      deleteCachePattern(`${CACHE_KEYS.PHOTOS_LIST}:*`),
      deleteCachePattern(`${CACHE_KEYS.CREATOR_PHOTOS}:*`),
    ]);
  },

  invalidateTrendingTags: async (): Promise<void> => {
    await deleteCache(CACHE_KEYS.TRENDING_TAGS);
  },

  invalidateCreatorDashboard: async (creatorId: string): Promise<void> => {
    await deleteCachePattern(`${CACHE_KEYS.CREATOR_PHOTOS}:${creatorId}:*`);
  },

  invalidateUserProfile: async (userId: string): Promise<void> => {
    await deleteCache(`${CACHE_KEYS.USER_PROFILE}:${userId}`);
  },

  invalidateUsernameCheck: async (): Promise<void> => {
    await deleteCachePattern(`${CACHE_KEYS.USERNAME_CHECK}:*`);
  },

  invalidateAdminCaches: async (): Promise<void> => {
    await Promise.all([
      deleteCache(CACHE_KEYS.ADMIN_OVERVIEW),
      deleteCachePattern(`${CACHE_KEYS.ADMIN_USERS}:*`),
      deleteCachePattern(`${CACHE_KEYS.ADMIN_PHOTOS}:*`),
      deleteCachePattern(`${CACHE_KEYS.ADMIN_COMMENTS}:*`),
    ]);
  },
};

export default cacheService;

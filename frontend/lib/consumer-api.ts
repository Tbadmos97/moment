import api from '@/lib/axios';
import type { Comment, Photo, TagSummary } from '@/types';

export type FeedSort = 'latest' | 'popular' | 'trending';

export type FeedParams = {
  pageParam?: number;
  limit?: number;
  sort?: FeedSort;
  tag?: string;
  search?: string;
};

export type PhotoFeedPayload = {
  photos: Photo[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
};

export type CommentsPayload = {
  comments: Comment[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
};

export const fetchPhotos = async ({ pageParam = 1, limit = 20, sort = 'latest', tag, search }: FeedParams): Promise<PhotoFeedPayload> => {
  const response = await api.get('/photos', {
    params: {
      page: pageParam,
      limit,
      sort,
      tag: tag || undefined,
      search: search || undefined,
    },
  });

  return response.data.data as PhotoFeedPayload;
};

export const fetchPhotoById = async (photoId: string): Promise<Photo> => {
  const response = await api.get(`/photos/${photoId}`);
  return response.data.data.photo as Photo;
};

export const fetchCreatorPhotos = async (creatorId: string, page = 1, limit = 20): Promise<PhotoFeedPayload> => {
  const response = await api.get(`/photos/creator/${creatorId}`, { params: { page, limit } });
  return response.data.data as PhotoFeedPayload;
};

export const fetchTrendingTags = async (): Promise<TagSummary[]> => {
  const response = await api.get('/photos/trending-tags');
  return (response.data.data.tags as TagSummary[]) ?? [];
};

export const likePhotoRequest = async (photoId: string): Promise<{ liked: boolean; likesCount: number }> => {
  const response = await api.post(`/photos/${photoId}/like`);
  return response.data.data as { liked: boolean; likesCount: number };
};

export const unlikePhotoRequest = async (photoId: string): Promise<{ liked: boolean; likesCount: number }> => {
  const response = await api.delete(`/photos/${photoId}/like`);
  return response.data.data as { liked: boolean; likesCount: number };
};

export const fetchComments = async (photoId: string, page = 1, limit = 20): Promise<CommentsPayload> => {
  const response = await api.get(`/comments/photo/${photoId}`, {
    params: {
      page,
      limit,
    },
  });

  return response.data.data as CommentsPayload;
};

export const createCommentRequest = async (
  photoId: string,
  payload: { text: string; rating?: number },
): Promise<Comment> => {
  const response = await api.post(`/comments/photo/${photoId}`, payload);
  return response.data.data.comment as Comment;
};

import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

export type AdminOverviewPayload = {
  users: {
    total: number;
    creators: number;
    consumers: number;
    admins: number;
    newToday: number;
  };
  photos: {
    total: number;
    published: number;
    drafts: number;
    uploadedToday: number;
  };
  comments: {
    total: number;
  };
};

export type AdminUser = {
  _id: string;
  username: string;
  email: string;
  role: 'creator' | 'consumer' | 'admin';
  isActive: boolean;
  createdAt: string;
};

export type AdminPhoto = {
  _id: string;
  title: string;
  caption: string;
  thumbnailUrl: string;
  creator: {
    _id: string;
    username: string;
    email: string;
    role: 'creator' | 'consumer' | 'admin';
  };
  likesCount: number;
  commentsCount: number;
  isPublished: boolean;
  createdAt: string;
};

export type AdminComment = {
  _id: string;
  text: string;
  rating?: number;
  createdAt: string;
  author: {
    _id: string;
    username: string;
    email: string;
    role: 'creator' | 'consumer' | 'admin';
  };
  photo: {
    _id: string;
    title: string;
    thumbnailUrl: string;
  };
};

export type PaginatedPayload<T> = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  users?: T[];
  photos?: T[];
  comments?: T[];
};

export const fetchAdminOverview = async (): Promise<AdminOverviewPayload> => {
  const response = await api.get<ApiResponse<AdminOverviewPayload>>('/admin/overview');
  return response.data.data as AdminOverviewPayload;
};

export const fetchAdminUsers = async (params: {
  page?: number;
  limit?: number;
  role?: 'all' | 'creator' | 'consumer' | 'admin';
  search?: string;
}): Promise<PaginatedPayload<AdminUser>> => {
  const response = await api.get<ApiResponse<PaginatedPayload<AdminUser>>>('/admin/users', { params });
  return response.data.data as PaginatedPayload<AdminUser>;
};

export const updateAdminUserRole = async (userId: string, role: 'creator' | 'consumer' | 'admin'): Promise<void> => {
  await api.patch(`/admin/users/${userId}/role`, { role });
};

export const updateAdminUserStatus = async (userId: string, isActive: boolean): Promise<void> => {
  await api.patch(`/admin/users/${userId}/status`, { isActive });
};

export const fetchAdminPhotos = async (params: {
  page?: number;
  limit?: number;
  status?: 'all' | 'published' | 'draft';
  search?: string;
}): Promise<PaginatedPayload<AdminPhoto>> => {
  const response = await api.get<ApiResponse<PaginatedPayload<AdminPhoto>>>('/admin/photos', { params });
  return response.data.data as PaginatedPayload<AdminPhoto>;
};

export const updateAdminPhotoPublishState = async (photoId: string, isPublished: boolean): Promise<void> => {
  await api.patch(`/admin/photos/${photoId}/publish`, { isPublished });
};

export const deleteAdminPhoto = async (photoId: string): Promise<void> => {
  await api.delete(`/admin/photos/${photoId}`);
};

export const fetchAdminComments = async (params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedPayload<AdminComment>> => {
  const response = await api.get<ApiResponse<PaginatedPayload<AdminComment>>>('/admin/comments', { params });
  return response.data.data as PaginatedPayload<AdminComment>;
};

export const deleteAdminComment = async (commentId: string): Promise<void> => {
  await api.delete(`/admin/comments/${commentId}`);
};

export interface User {
  _id: string;
  username: string;
  email?: string;
  role: 'creator' | 'consumer' | 'admin';
  avatar?: string;
  bio?: string;
  createdAt: string;
}

export interface TagSummary {
  tag: string;
  count: number;
}

export interface LocationData {
  name?: string;
  coordinates?: number[];
}

export interface Photo {
  _id: string;
  title: string;
  caption: string;
  location?: LocationData;
  people?: string[];
  imageUrl: string;
  thumbnailUrl: string;
  creator: User;
  likes?: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount?: number;
  tags?: string[];
  isLiked?: boolean;
  createdAt: string;
  comments?: Comment[];
}

export interface Comment {
  _id: string;
  text: string;
  author: User;
  photo: string;
  rating?: number;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  photos?: T[];
  comments?: T[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

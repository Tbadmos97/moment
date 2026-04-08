export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'creator' | 'consumer';
  avatar?: string;
  bio?: string;
  createdAt: string;
}

export interface Photo {
  _id: string;
  title: string;
  caption: string;
  location?: string;
  people?: string[];
  imageUrl: string;
  thumbnailUrl: string;
  creator: User;
  likes: string[];
  likesCount: number;
  commentsCount: number;
  tags?: string[];
  createdAt: string;
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
  data: T[];
  page: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

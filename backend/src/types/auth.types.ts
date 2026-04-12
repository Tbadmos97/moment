export type UserRole = 'creator' | 'consumer' | 'admin';

export interface AuthJwtPayload {
  userId: string;
  role: UserRole;
}

export interface RefreshJwtPayload {
  userId: string;
}

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

export interface AppError extends Error {
  statusCode?: number;
  errors?: unknown[];
}

import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import toast from 'react-hot-toast';

import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth';

type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type QueueItem = {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
});

let isRefreshing = false;
let refreshQueue: QueueItem[] = [];

/**
 * Resolves queued requests after token refresh flow finishes.
 */
const processQueue = (error: unknown, token: string | null): void => {
  refreshQueue.forEach((pending) => {
    if (error || !token) {
      pending.reject(error ?? new Error('No token returned'));
      return;
    }

    pending.resolve(token);
  });

  refreshQueue = [];
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;

    if (typeof window === 'undefined' || !originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest as AxiosRequestConfig));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshClient = axios.create({
          baseURL: API_BASE_URL,
          withCredentials: true,
        });

        const response = await refreshClient.post('/auth/refresh', { refreshToken });
        const newAccessToken = response.data?.data?.accessToken as string | undefined;

        if (!newAccessToken) {
          throw new Error('Unable to refresh session. Please log in again.');
        }

        setTokens({
          accessToken: newAccessToken,
          refreshToken,
        });
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest as AxiosRequestConfig);
      } catch (refreshError) {
        clearTokens();
        processQueue(refreshError, null);
        toast.error('Session expired. Please sign in again.');

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (!error.response) {
      toast.error('Network error. Please check your internet connection.');
    }

    return Promise.reject(error);
  },
);

export default api;

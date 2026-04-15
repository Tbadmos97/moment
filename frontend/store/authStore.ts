'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import api from '@/lib/axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '@/lib/auth';
import type { ApiResponse, User } from '@/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  role?: 'creator' | 'consumer';
  creatorAccessCode?: string;
}

interface AuthPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface RefreshPayload {
  accessToken: string;
  refreshToken: string;
}

interface MePayload {
  user: User;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  becomeCreator: (creatorAccessCode: string) => Promise<void>;
  setUser: (user: User) => void;
  initializeAuth: () => Promise<void>;
}

const applyAuth = (payload: AuthPayload | (MePayload & RefreshPayload), set: (state: Partial<AuthState>) => void): void => {
  setTokens({
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  });

  set({
    user: payload.user,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    isAuthenticated: true,
  });
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      hasHydrated: false,

      login: async (credentials) => {
        set({ isLoading: true });

        try {
          const response = await api.post<ApiResponse<AuthPayload>>('/auth/login', credentials);
          const payload = response.data.data;

          if (!payload) {
            throw new Error('Invalid login response');
          }

          applyAuth(payload, set);
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data) => {
        set({ isLoading: true });

        try {
          const response = await api.post<ApiResponse<AuthPayload>>('/auth/register', data);
          const payload = response.data.data;

          if (!payload) {
            throw new Error('Invalid registration response');
          }

          applyAuth(payload, set);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const currentRefreshToken = get().refreshToken ?? getRefreshToken();

        set({ isLoading: true });

        try {
          if (currentRefreshToken) {
            await api.post('/auth/logout', { refreshToken: currentRefreshToken });
          }
        } finally {
          clearTokens();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      refreshTokens: async () => {
        const token = get().refreshToken ?? getRefreshToken();

        if (!token) {
          throw new Error('No refresh token available');
        }

        const response = await api.post<ApiResponse<RefreshPayload>>('/auth/refresh', {
          refreshToken: token,
        });

        const payload = response.data.data;

        if (!payload) {
          throw new Error('Invalid refresh response');
        }

        setTokens(payload);
        set({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
          isAuthenticated: true,
        });
      },

      becomeCreator: async (creatorAccessCode) => {
        set({ isLoading: true });

        try {
          const response = await api.post<ApiResponse<AuthPayload>>('/auth/become-creator', {
            creatorAccessCode,
          });
          const payload = response.data.data;

          if (!payload) {
            throw new Error('Invalid upgrade response');
          }

          applyAuth(payload, set);
        } finally {
          set({ isLoading: false });
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: true });
      },

      initializeAuth: async () => {
        if (get().hasHydrated) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true, hasHydrated: true });

        const accessToken = get().accessToken ?? getAccessToken();
        const refreshToken = get().refreshToken ?? getRefreshToken();

        if (!accessToken || !refreshToken) {
          clearTokens();
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        try {
          const meResponse = await api.get<ApiResponse<MePayload>>('/auth/me');
          const mePayload = meResponse.data.data;

          if (!mePayload) {
            throw new Error('Invalid me response');
          }

          set({
            user: mePayload.user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch {
          try {
            await get().refreshTokens();
            const meResponse = await api.get<ApiResponse<MePayload>>('/auth/me');
            const mePayload = meResponse.data.data;

            if (!mePayload) {
              throw new Error('Invalid me response');
            }

            set({
              user: mePayload.user,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch {
            clearTokens();
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        }
      },
    }),
    {
      name: 'moment-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);

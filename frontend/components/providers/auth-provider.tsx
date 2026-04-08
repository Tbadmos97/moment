'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { User } from '@/types';

type AuthContextValue = {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, refreshToken: string, nextUser: User) => void;
  logout: () => void;
  updateUser: (nextUser: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'moment_access_token';
const REFRESH_TOKEN_KEY = 'moment_refresh_token';
const USER_KEY = 'moment_user';

/**
 * Provides authentication state and helpers to client components.
 */
export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedAccessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    const savedUser = window.localStorage.getItem(USER_KEY);

    setAccessToken(savedAccessToken);

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as User);
      } catch {
        window.localStorage.removeItem(USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const login = useCallback((token: string, refreshToken: string, nextUser: User) => {
    setAccessToken(token);
    setUser(nextUser);
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }, []);

  const updateUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);

    if (nextUser) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      return;
    }

    window.localStorage.removeItem(USER_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      user,
      isAuthenticated: Boolean(accessToken && user),
      isLoading,
      login,
      logout,
      updateUser,
    }),
    [accessToken, isLoading, login, logout, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}

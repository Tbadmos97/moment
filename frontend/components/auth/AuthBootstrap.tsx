'use client';

import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

/**
 * Restores auth session once at app startup.
 */
export default function AuthBootstrap(): null {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return null;
}

'use client';

import { useEffect, useRef } from 'react';

import { useAuthStore } from '@/store/authStore';

/**
 * Restores auth session once at app startup.
 */
export default function AuthBootstrap(): null {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    void useAuthStore.getState().initializeAuth();
  }, []);

  return null;
}

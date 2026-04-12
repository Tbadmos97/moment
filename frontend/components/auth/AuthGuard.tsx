'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
  allowRoles?: Array<'creator' | 'consumer' | 'admin'>;
}

/**
 * Protects private pages by redirecting unauthenticated users and enforcing role-based routing.
 */
export default function AuthGuard({ children, allowRoles }: AuthGuardProps): JSX.Element {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
  }));

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }

    if (!allowRoles || allowRoles.length === 0) {
      return;
    }

    if (!allowRoles.includes(user.role)) {
      router.replace(user.role === 'creator' ? '/creator' : '/');
    }
  }, [allowRoles, isAuthenticated, isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl animate-pulse space-y-3 rounded-2xl border border-border bg-bg-card p-6">
        <div className="h-4 w-28 rounded bg-bg-hover" />
        <div className="h-10 w-full rounded bg-bg-hover" />
        <div className="h-10 w-full rounded bg-bg-hover" />
        <div className="h-10 w-40 rounded bg-bg-hover" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <></>;
  }

  if (allowRoles && allowRoles.length > 0 && !allowRoles.includes(user.role)) {
    return <></>;
  }

  return <>{children}</>;
}

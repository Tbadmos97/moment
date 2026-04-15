'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';

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
  const pathname = usePathname();
  const userRole = useAuthStore((state) => state.user?.role ?? null);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const lastRedirectRef = useRef<string | null>(null);
  const allowRolesKey = useMemo(() => (allowRoles && allowRoles.length > 0 ? allowRoles.join(',') : ''), [allowRoles]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    let targetPath: string | null = null;

    if (!isAuthenticated || !userRole) {
      if (pathname !== '/') {
        targetPath = '/';
      }
    } else if (allowRoles && allowRoles.length > 0 && !allowRoles.includes(userRole)) {
      const fallback = userRole === 'creator' || userRole === 'admin' ? '/creator' : '/discover';

      if (pathname !== fallback) {
        targetPath = fallback;
      }
    }

    if (!targetPath) {
      lastRedirectRef.current = null;
      return;
    }

    if (lastRedirectRef.current === targetPath) {
      return;
    }

    lastRedirectRef.current = targetPath;
    router.replace(targetPath);
  }, [allowRoles, allowRolesKey, isAuthenticated, isLoading, pathname, router, userRole]);

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

  if (!isAuthenticated || !userRole) {
    return <></>;
  }

  if (allowRoles && allowRoles.length > 0 && !allowRoles.includes(userRole)) {
    return <></>;
  }

  return <>{children}</>;
}

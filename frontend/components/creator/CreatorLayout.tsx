'use client';

import clsx from 'clsx';
import { Grid2X2, ImageUp, LayoutDashboard, LogOut, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/authStore';

interface CreatorLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: 'Dashboard', href: '/creator', icon: LayoutDashboard },
  { label: 'Upload', href: '/creator/upload', icon: ImageUp },
  { label: 'My Photos', href: '/creator/my-photos', icon: Grid2X2 },
  { label: 'Profile', href: '/creator/profile', icon: UserCircle2 },
];

export default function CreatorLayout({ children }: CreatorLayoutProps): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace('/');
  };

  return (
    <div className="min-h-screen app-shell-bg bg-bg-primary text-text-primary page-enter md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-border/90 bg-bg-secondary/78 px-6 py-7 backdrop-blur-sm md:flex md:flex-col">
        <Link href="/" className="brand-wordmark text-3xl">
          MOMENT
        </Link>

        <nav className="mt-10 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'nav-item group relative flex items-center gap-3 px-4 py-3 text-sm',
                  isActive
                    ? 'nav-item-active text-text-primary'
                    : 'text-text-secondary',
                )}
              >
                <Icon size={16} />
                {item.label}
                {isActive ? <span className="absolute bottom-1 left-4 h-0.5 w-10 rounded bg-accent-gold" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="glass-panel mt-auto p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Creator</p>
          <p className="mt-1 text-sm font-medium">{user?.username ?? 'Creator User'}</p>
          <p className="text-xs text-text-secondary">{user?.email ?? 'user@moment.app'}</p>
        </div>
      </aside>

      <section className="pb-20 md:pb-0">
        <div className="sticky top-0 z-20 border-b border-border/80 bg-black/62 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Creator Workspace</p>
              <p className="text-sm text-text-secondary">Welcome back, {user?.username ?? 'Creator'}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="ui-btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.14em]"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>

        {children}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-bg-secondary/95 backdrop-blur md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 py-3 text-[11px] transition',
                isActive ? 'text-accent-gold' : 'text-text-secondary',
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

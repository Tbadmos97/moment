'use client';

import clsx from 'clsx';
import { Grid2X2, ImageUp, LayoutDashboard, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary md:grid md:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-border bg-bg-secondary/60 px-6 py-7 md:flex md:flex-col">
        <Link href="/" className="text-3xl font-display tracking-wide text-text-primary">
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
                  'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition',
                  isActive
                    ? 'bg-bg-card text-text-primary'
                    : 'text-text-secondary hover:bg-bg-card hover:text-text-primary',
                )}
              >
                <Icon size={16} />
                {item.label}
                {isActive ? <span className="absolute bottom-1 left-4 h-0.5 w-10 rounded bg-accent-gold" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-border bg-bg-card p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Creator</p>
          <p className="mt-1 text-sm font-medium">{user?.username ?? 'Creator User'}</p>
          <p className="text-xs text-text-secondary">{user?.email ?? 'user@moment.app'}</p>
        </div>
      </aside>

      <section className="pb-20 md:pb-0">{children}</section>

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

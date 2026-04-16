'use client';

import clsx from 'clsx';
import { LayoutDashboard, MessageSquareText, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/authStore';

const navItems = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Photos', href: '/admin/photos', icon: ShieldCheck },
  { label: 'Comments', href: '/admin/comments', icon: MessageSquareText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen app-shell-bg bg-bg-primary text-text-primary page-enter md:grid md:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-border/80 bg-bg-secondary/55 px-6 py-7 backdrop-blur md:flex md:flex-col">
        <Link href="/admin" className="brand-wordmark text-3xl">
          MOMENT
        </Link>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-accent-gold">Admin Console</p>

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
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Signed in as</p>
          <p className="mt-1 text-sm font-medium">{user?.username ?? 'Admin'}</p>
          <p className="text-xs text-text-secondary">{user?.email ?? 'admin@moment.app'}</p>

          <button
            type="button"
            className="ui-btn-secondary mt-3 w-full px-3 py-2 text-xs uppercase tracking-[0.14em]"
            onClick={async () => {
              await logout();
              router.replace('/register');
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="p-4 pb-20 md:p-8 md:pb-8">{children}</main>

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

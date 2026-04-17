'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Menu, Search, User, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { useAuthStore } from '@/store/authStore';

export default function Header(): JSX.Element {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const userRole = useAuthStore((state) => state.user?.role);

  const profileHref = userRole === 'admin' ? '/admin' : userRole === 'creator' ? '/creator/profile' : '/profile';

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace('/');
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onScroll = (): void => {
      setScrolled(window.scrollY > 8);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextValue = query.trim();

    if (!nextValue) {
      router.push('/search');
      return;
    }

    router.push(`/search?q=${encodeURIComponent(nextValue)}`);
    setDrawerOpen(false);
  };

  const activeSearchValue = searchParams.get('q') ?? '';

  const blurStyle = scrolled || pathname !== '/' ? 'bg-black/72 backdrop-blur-sm border-border/90 shadow-[0_10px_30px_rgba(0,0,0,0.45)]' : 'bg-black/52 backdrop-blur-sm border-border/70';

  return (
    <header className={`sticky top-0 z-40 border-b transition-all duration-300 ${blurStyle}`}>
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="brand-wordmark text-2xl">
          MOMENT
        </Link>

        <motion.form
          layoutId="header-search"
          onSubmit={onSubmit}
          className="relative hidden flex-1 items-center rounded-full border border-border/90 bg-black/60 px-4 py-2 md:flex"
          whileFocus={{ scale: 1.01 }}
        >
          <Search size={17} className="text-text-secondary" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            placeholder={activeSearchValue || 'Search stories, creators, and moods'}
            className="ml-3 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          <AnimatePresence>
            {searchOpen ? (
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="text-xs uppercase tracking-[0.16em] text-accent-gold"
              >
                Press enter
              </motion.span>
            ) : null}
          </AnimatePresence>
        </motion.form>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <button className="ui-btn-ghost rounded-full p-2 text-text-primary" type="button" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <Link href={profileHref} className="ui-btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.14em]" aria-label="Profile">
            <User size={14} />
            Profile
          </Link>
          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
            className="ui-btn-primary px-4 py-2 text-xs uppercase tracking-[0.14em]"
          >
            Logout
          </button>
        </div>

        <button
          type="button"
          className="ui-btn-ghost ml-auto rounded-full p-2 md:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
      </div>

      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-black/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
              className="fixed right-0 top-0 z-50 flex h-full w-[88%] max-w-sm flex-col gap-6 border-l border-border bg-bg-secondary/98 p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <p className="brand-wordmark text-2xl">MOMENT</p>
                <button type="button" onClick={() => setDrawerOpen(false)} className="ui-btn-ghost rounded-full p-2">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={onSubmit} className="flex items-center rounded-full border border-border bg-black/40 px-4 py-2">
                <Search size={17} className="text-text-secondary" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="ml-3 w-full bg-transparent text-sm text-text-primary outline-none"
                />
              </form>

              <Link href="/" onClick={() => setDrawerOpen(false)} className="text-sm uppercase tracking-[0.18em] text-text-secondary">
                Home Feed
              </Link>
              <Link href="/search" onClick={() => setDrawerOpen(false)} className="text-sm uppercase tracking-[0.18em] text-text-secondary">
                Explore Search
              </Link>
              <Link href="/discover" onClick={() => setDrawerOpen(false)} className="text-sm uppercase tracking-[0.18em] text-text-secondary">
                Discover
              </Link>
              <Link href={profileHref} onClick={() => setDrawerOpen(false)} className="text-sm uppercase tracking-[0.18em] text-text-secondary">
                Profile
              </Link>

              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="ui-btn-secondary mt-auto px-4 py-2 text-sm"
              >
                Logout
              </button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

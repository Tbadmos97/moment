'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const carouselImages = [
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1800&q=80',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1800&q=80',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1800&q=80',
];

export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const pathname = usePathname();

  return (
    <main className="grid min-h-screen bg-bg-primary page-enter md:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden md:block">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0.35, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.25, scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${carouselImages[Math.abs(pathname.length) % carouselImages.length]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/65 to-black/80" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-text-primary">
          <div>
            <p className="brand-wordmark text-6xl">MOMENT</p>
            <p className="mt-4 max-w-md text-lg text-text-secondary">Capture the moment. Share the story.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-accent-gold">COM769 • Scalable Advanced Software Solutions</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className={`w-full ${pathname.includes('/register') ? 'max-w-xl' : 'max-w-lg'}`}>
          <Link href="/" className="brand-wordmark mb-8 inline-flex text-3xl md:hidden">
            MOMENT
          </Link>
          <motion.div
            layoutId="auth-card"
            className="glass-panel p-8 sm:p-9"
          >
            {children}
          </motion.div>
        </div>
      </section>
    </main>
  );
}

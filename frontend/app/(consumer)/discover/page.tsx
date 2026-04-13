import AuthGuard from '@/components/auth/AuthGuard';

export default function DiscoverPage(): JSX.Element {
  return (
    <AuthGuard allowRoles={['consumer', 'admin']}>
      <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-14 sm:px-10">
        <p className="mb-3 inline-flex rounded-full border border-accent-gold/50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent-gold">
          Consumer Space
        </p>
        <h1 className="text-4xl font-display text-text-primary md:text-5xl">Discover Moments</h1>
        <p className="mt-4 max-w-2xl text-sm text-text-secondary md:text-base">
          Your personalized browsing feed is active. Search, explore creators, and interact with photos from this space.
        </p>
      </main>
    </AuthGuard>
  );
}

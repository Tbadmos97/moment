import Link from 'next/link';

export default function NotFound(): JSX.Element {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 24 }).map((_, index) => (
          <span
            key={index}
            className="absolute h-1.5 w-1.5 animate-[floatParticle_9s_ease-in-out_infinite] rounded-full bg-accent-gold/45"
            style={{
              left: `${(index * 17) % 100}%`,
              top: `${(index * 29) % 100}%`,
              animationDelay: `${(index % 8) * 0.6}s`,
            }}
          />
        ))}
      </div>

      <section className="relative z-10 w-full max-w-2xl rounded-3xl border border-border bg-black/40 p-8 text-center backdrop-blur">
        <p className="text-xs uppercase tracking-[0.24em] text-accent-gold">404</p>
        <h1 className="mt-3 font-display text-5xl leading-tight text-text-primary sm:text-6xl">This moment doesn&apos;t exist</h1>
        <p className="mt-4 text-sm text-text-secondary">The frame you are looking for may have been removed, never published, or moved to another timeline.</p>

        <Link
          href="/"
          className="mt-7 inline-flex rounded-xl bg-accent-gold px-5 py-3 text-sm font-semibold text-black transition hover:-translate-y-[1px] hover:bg-accent-gold-light hover:shadow-[0_8px_20px_rgba(201,168,76,0.25)]"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}

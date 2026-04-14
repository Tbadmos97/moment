import Link from 'next/link';

export default function HomePage(): JSX.Element {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-primary">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, rgba(201,168,76,0.18), transparent 25%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.06), transparent 20%), linear-gradient(180deg, rgba(0,0,0,0.62), rgba(0,0,0,0.85))",
        }}
      />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl rounded-3xl border border-border/80 bg-black/40 p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-accent-gold">Welcome to MOMENT</p>
          <h1 className="mt-4 font-display text-4xl text-text-primary sm:text-5xl">Capture the moment. Share the story.</h1>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
            Sign in to explore the live photo world, or create an account to join as a consumer or creator.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border border-border bg-bg-card px-4 py-3 text-sm font-semibold text-text-primary transition hover:border-accent-gold hover:text-accent-gold"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-gold-light"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

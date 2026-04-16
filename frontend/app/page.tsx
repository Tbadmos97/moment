import Link from 'next/link';

export default function HomePage(): JSX.Element {
  return (
    <main className="relative min-h-screen overflow-hidden bg-bg-primary page-enter">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%, rgba(201,168,76,0.18), transparent 25%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.06), transparent 20%), linear-gradient(180deg, rgba(0,0,0,0.62), rgba(0,0,0,0.85))",
        }}
      />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="glass-panel w-full max-w-2xl p-8 text-center sm:p-10">
          <p className="ui-chip">Welcome to MOMENT</p>
          <h1 className="headline-display mt-5 text-4xl text-text-primary sm:text-5xl">Capture the moment. Share the story.</h1>
          <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:text-base">
            Sign in to explore the live photo world, or create an account to join as a consumer or creator.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/login"
              className="ui-btn-secondary inline-flex items-center justify-center px-4 py-3 text-sm font-semibold"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="ui-btn-primary inline-flex items-center justify-center px-4 py-3 text-sm font-semibold"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

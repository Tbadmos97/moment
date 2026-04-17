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
        <div className="clarity-panel w-full max-w-4xl p-8 sm:p-12">
          <p className="ui-chip">Welcome to MOMENT</p>
          <h1 className="headline-display mt-5 text-4xl text-text-primary sm:text-6xl">Capture the moment. Share the story.</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
            Discover curated photography, publish your own visual stories, and manage your creator workflow with polished analytics.
          </p>

          <div className="mt-9 grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2">
            <Link
              href="/login"
              className="ui-btn-secondary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="ui-btn-primary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold"
            >
              Create Account
            </Link>
          </div>

          <div className="mt-10 grid gap-3 text-sm text-text-secondary sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-black/30 px-4 py-3">Creator Dashboard with quality scoring and action playbooks</div>
            <div className="rounded-xl border border-border bg-black/30 px-4 py-3">Adaptive feed experience for smoother discovery</div>
            <div className="rounded-xl border border-border bg-black/30 px-4 py-3">Snapshot exports and date-ranged performance insights</div>
          </div>
        </div>
      </section>
    </main>
  );
}

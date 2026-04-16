export default function GlobalLoading(): JSX.Element {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="h-4 w-40 animate-pulse rounded bg-bg-card" />
        <div className="mt-3 h-10 w-full max-w-2xl animate-pulse rounded bg-bg-card" />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-56 animate-pulse rounded-2xl border border-border bg-bg-card" />
        ))}
      </section>
    </main>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminOverview } from '@/lib/admin-api';

const metricCardClass = 'rounded-2xl border border-border bg-bg-card/60 p-5';

export default function AdminOverviewPage(): JSX.Element {
  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: fetchAdminOverview,
  });

  const data = overviewQuery.data;

  return (
    <section>
      <p className="text-xs uppercase tracking-[0.22em] text-accent-gold">Admin</p>
      <h1 className="mt-2 font-display text-4xl text-text-primary">Platform Control Center</h1>
      <p className="mt-2 max-w-3xl text-sm text-text-secondary">
        Monitor user growth, moderation volume, and publishing activity across MOMENT in real-time.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={metricCardClass}>
          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Total Users</p>
          <p className="mt-2 text-3xl font-display">{data?.users.total ?? 0}</p>
          <p className="mt-1 text-xs text-text-secondary">+{data?.users.newToday ?? 0} today</p>
        </article>
        <article className={metricCardClass}>
          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Creators</p>
          <p className="mt-2 text-3xl font-display">{data?.users.creators ?? 0}</p>
          <p className="mt-1 text-xs text-text-secondary">Admins: {data?.users.admins ?? 0}</p>
        </article>
        <article className={metricCardClass}>
          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Photos</p>
          <p className="mt-2 text-3xl font-display">{data?.photos.total ?? 0}</p>
          <p className="mt-1 text-xs text-text-secondary">+{data?.photos.uploadedToday ?? 0} today</p>
        </article>
        <article className={metricCardClass}>
          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Comments</p>
          <p className="mt-2 text-3xl font-display">{data?.comments.total ?? 0}</p>
          <p className="mt-1 text-xs text-text-secondary">Community moderation queue</p>
        </article>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-border bg-bg-card/60 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">User Distribution</p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between"><span className="text-text-secondary">Consumers</span><span>{data?.users.consumers ?? 0}</span></p>
            <p className="flex items-center justify-between"><span className="text-text-secondary">Creators</span><span>{data?.users.creators ?? 0}</span></p>
            <p className="flex items-center justify-between"><span className="text-text-secondary">Admins</span><span>{data?.users.admins ?? 0}</span></p>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-bg-card/60 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Publishing Health</p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between"><span className="text-text-secondary">Published</span><span>{data?.photos.published ?? 0}</span></p>
            <p className="flex items-center justify-between"><span className="text-text-secondary">Drafts</span><span>{data?.photos.drafts ?? 0}</span></p>
          </div>
        </article>
      </div>

      {overviewQuery.isPending ? <p className="mt-5 text-sm text-text-secondary">Loading admin overview...</p> : null}
    </section>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Camera, ChartColumn, Clock3, Heart, MessageCircle, Sparkles, Upload } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { fetchCreatorPhotos } from '@/lib/consumer-api';
import { useAuthStore } from '@/store/authStore';

type DashboardMetric = {
  label: string;
  value: string;
  hint: string;
  icon: JSX.Element;
};

const formatCompact = (value: number): string =>
  new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);

export default function CreatorDashboardPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  const photosQuery = useQuery({
    queryKey: ['creator-dashboard-photos', user?._id],
    queryFn: () => fetchCreatorPhotos(user?._id ?? '', 1, 60),
    enabled: Boolean(user?._id),
  });

  const photos = useMemo(() => photosQuery.data?.photos ?? [], [photosQuery.data?.photos]);

  const metrics = useMemo<DashboardMetric[]>(() => {
    const published = photos.filter((photo) => photo.isPublished);
    const drafts = photos.length - published.length;
    const likes = published.reduce((acc, photo) => acc + (photo.likesCount ?? 0), 0);
    const comments = published.reduce((acc, photo) => acc + (photo.commentsCount ?? 0), 0);
    const engagementRate = published.length > 0 ? Math.round(((likes + comments) / published.length) * 10) / 10 : 0;

    return [
      {
        label: 'Published',
        value: String(published.length),
        hint: `${drafts} draft${drafts === 1 ? '' : 's'} in pipeline`,
        icon: <Camera size={16} />,
      },
      {
        label: 'Total Likes',
        value: formatCompact(likes),
        hint: 'Community appreciation',
        icon: <Heart size={16} />,
      },
      {
        label: 'Total Comments',
        value: formatCompact(comments),
        hint: 'Conversation depth',
        icon: <MessageCircle size={16} />,
      },
      {
        label: 'Avg Engagement',
        value: `${engagementRate}`,
        hint: 'Interactions per published post',
        icon: <ChartColumn size={16} />,
      },
    ];
  }, [photos]);

  const topPhotos = useMemo(() => {
    return [...photos]
      .filter((photo) => photo.isPublished)
      .sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount))
      .slice(0, 3);
  }, [photos]);

  const priorities = useMemo(() => {
    const list: string[] = [];
    const published = photos.filter((photo) => photo.isPublished);
    const drafts = photos.filter((photo) => !photo.isPublished);

    if (drafts.length > 0) {
      list.push(`You have ${drafts.length} draft${drafts.length === 1 ? '' : 's'} waiting. Publish one today to sustain momentum.`);
    }

    if (published.length < 3) {
      list.push('Build your first portfolio baseline of 3 published moments to improve discoverability.');
    }

    const lowTagCoverage = published.some((photo) => (photo.tags?.length ?? 0) < 3);
    if (lowTagCoverage) {
      list.push('Some posts are under-tagged. Aim for at least 3 tags per post for broader reach.');
    }

    if (list.length === 0) {
      list.push('Great consistency. Continue publishing and iterate on your strongest visual themes.');
    }

    return list.slice(0, 3);
  }, [photos]);

  return (
    <main className="p-6 md:p-10">
      <section className="rounded-3xl border border-border bg-bg-card/70 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Creator command center</p>
        <h1 className="mt-3 font-display text-4xl text-text-primary md:text-5xl">Performance cockpit</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Track momentum, prioritize your next move, and keep your publishing rhythm strong.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/creator/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-accent-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent-gold-light"
          >
            <Upload size={15} />
            New upload
          </Link>
          <Link
            href="/creator/my-photos"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-accent-gold"
          >
            <ArrowUpRight size={15} />
            Open gallery
          </Link>
        </div>
      </section>

      {photosQuery.isPending ? (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border bg-bg-card" />
          ))}
        </section>
      ) : (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="rounded-2xl border border-border bg-bg-card/80 p-4">
              <div className="flex items-center justify-between text-text-muted">
                <p className="text-xs uppercase tracking-[0.14em]">{metric.label}</p>
                <span>{metric.icon}</span>
              </div>
              <p className="mt-2 font-display text-4xl text-text-primary">{metric.value}</p>
              <p className="mt-1 text-xs text-text-secondary">{metric.hint}</p>
            </article>
          ))}
        </section>
      )}

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-border bg-bg-card/70 p-5">
          <div className="flex items-center gap-2 text-accent-gold">
            <Sparkles size={16} />
            <p className="text-xs uppercase tracking-[0.14em]">Top performing moments</p>
          </div>

          {topPhotos.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">Publish a few moments and your top performers will appear here.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {topPhotos.map((photo, index) => (
                <div key={photo._id} className="rounded-xl border border-border bg-black/20 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Rank #{index + 1}</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{photo.title}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {photo.likesCount} likes • {photo.commentsCount} comments
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-border bg-bg-card/70 p-5">
          <div className="flex items-center gap-2 text-accent-gold">
            <Clock3 size={16} />
            <p className="text-xs uppercase tracking-[0.14em]">Priority queue</p>
          </div>
          <div className="mt-3 space-y-2">
            {priorities.map((item) => (
              <div key={item} className="rounded-xl border border-border bg-black/20 px-3 py-3 text-sm text-text-secondary">
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

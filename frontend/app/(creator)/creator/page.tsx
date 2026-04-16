'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Camera,
  ChartColumn,
  CheckCircle2,
  Clock3,
  Download,
  Heart,
  MessageCircle,
  Printer,
  Sparkles,
  TrendingUp,
  Upload,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchCreatorPhotos } from '@/lib/consumer-api';
import { useAuthStore } from '@/store/authStore';

type DashboardMetric = {
  label: string;
  value: string;
  hint: string;
  icon: JSX.Element;
};

type RangeKey = '30d' | '90d' | '180d' | 'all';

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
  { key: '180d', label: '180D' },
  { key: 'all', label: 'All' },
];

const RANGE_TO_DAYS: Record<Exclude<RangeKey, 'all'>, number> = {
  '30d': 30,
  '90d': 90,
  '180d': 180,
};

const formatCompact = (value: number): string =>
  new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);

const getDaypartLabel = (hour: number): string => {
  if (hour >= 5 && hour < 12) {
    return 'Morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Afternoon';
  }

  if (hour >= 17 && hour < 22) {
    return 'Evening';
  }

  return 'Late night';
};

const getMonthLabel = (date: Date): string =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
  }).format(date);

const isRangeKey = (value: string | null): value is RangeKey => {
  return value === '30d' || value === '90d' || value === '180d' || value === 'all';
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export default function CreatorDashboardPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedRange, setSelectedRange] = useState<RangeKey>('90d');

  const photosQuery = useQuery({
    queryKey: ['creator-dashboard-photos', user?._id],
    queryFn: () => fetchCreatorPhotos(user?._id ?? '', 1, 200),
    enabled: Boolean(user?._id),
  });

  const photos = useMemo(() => photosQuery.data?.photos ?? [], [photosQuery.data?.photos]);

  useEffect(() => {
    const rangeFromUrl = searchParams.get('range');
    if (isRangeKey(rangeFromUrl)) {
      setSelectedRange(rangeFromUrl);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('creator-dashboard-range', rangeFromUrl);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('creator-dashboard-range');
      if (isRangeKey(stored)) {
        setSelectedRange(stored);
        const params = new URLSearchParams(searchParams.toString());
        params.set('range', stored);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }
  }, [pathname, router, searchParams]);

  const handleRangeChange = useCallback(
    (nextRange: RangeKey) => {
      setSelectedRange(nextRange);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('creator-dashboard-range', nextRange);
      }

      const params = new URLSearchParams(searchParams.toString());
      params.set('range', nextRange);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const scopedPhotos = useMemo(() => {
    if (selectedRange === 'all') {
      return photos;
    }

    const days = RANGE_TO_DAYS[selectedRange];
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    return photos.filter((photo) => new Date(photo.createdAt).getTime() >= cutoff);
  }, [photos, selectedRange]);

  const rangeLabel = useMemo(() => {
    const option = RANGE_OPTIONS.find((item) => item.key === selectedRange);
    return option?.label ?? '90D';
  }, [selectedRange]);

  const metrics = useMemo<DashboardMetric[]>(() => {
    const published = scopedPhotos.filter((photo) => photo.isPublished);
    const drafts = scopedPhotos.length - published.length;
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
  }, [scopedPhotos]);

  const topPhotos = useMemo(() => {
    return [...scopedPhotos]
      .filter((photo) => photo.isPublished)
      .sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount))
      .slice(0, 3);
  }, [scopedPhotos]);

  const priorities = useMemo(() => {
    const list: string[] = [];
    const published = scopedPhotos.filter((photo) => photo.isPublished);
    const drafts = scopedPhotos.filter((photo) => !photo.isPublished);

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
  }, [scopedPhotos]);

  const tagTrendBreakdown = useMemo(() => {
    const published = scopedPhotos.filter((photo) => photo.isPublished);
    const recent = [...published]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);
    const total = recent.length;
    const trendMap = new Map<string, { count: number; likes: number; comments: number }>();

    for (const photo of recent) {
      const uniqueTags = Array.from(new Set((photo.tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
      for (const tag of uniqueTags) {
        const existing = trendMap.get(tag) ?? { count: 0, likes: 0, comments: 0 };
        trendMap.set(tag, {
          count: existing.count + 1,
          likes: existing.likes + (photo.likesCount ?? 0),
          comments: existing.comments + (photo.commentsCount ?? 0),
        });
      }
    }

    return [...trendMap.entries()]
      .map(([tag, stats]) => {
        const share = total > 0 ? Math.round((stats.count / total) * 100) : 0;
        const engagement = stats.likes + stats.comments;
        return {
          tag,
          share,
          posts: stats.count,
          engagement,
        };
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 5);
  }, [scopedPhotos]);

  const bestPostingWindow = useMemo(() => {
    const published = scopedPhotos.filter((photo) => photo.isPublished);
    if (published.length === 0) {
      return {
        label: 'Not enough data yet',
        hint: 'Publish a few moments and we will surface your highest-performing time window.',
      };
    }

    const hourStats = new Map<number, { totalEngagement: number; posts: number }>();

    for (const photo of published) {
      const hour = new Date(photo.createdAt).getHours();
      const engagement = (photo.likesCount ?? 0) + (photo.commentsCount ?? 0);
      const existing = hourStats.get(hour) ?? { totalEngagement: 0, posts: 0 };
      hourStats.set(hour, {
        totalEngagement: existing.totalEngagement + engagement,
        posts: existing.posts + 1,
      });
    }

    let bestHour = 0;
    let bestScore = -1;

    for (const [hour, stats] of hourStats.entries()) {
      const avg = stats.posts > 0 ? stats.totalEngagement / stats.posts : 0;
      if (avg > bestScore) {
        bestScore = avg;
        bestHour = hour;
      }
    }

    const start = bestHour.toString().padStart(2, '0');
    const end = ((bestHour + 2) % 24).toString().padStart(2, '0');

    return {
      label: `${getDaypartLabel(bestHour)} (${start}:00-${end}:00)`,
      hint: `Your average engagement peaks around ${start}:00 based on published history.`,
    };
  }, [scopedPhotos]);

  const monthlyMomentum = useMemo(() => {
    const published = scopedPhotos.filter((photo) => photo.isPublished);
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      return {
        key,
        label: getMonthLabel(monthDate),
        posts: 0,
        engagement: 0,
      };
    });

    const monthMap = new Map(months.map((item) => [item.key, item]));

    for (const photo of published) {
      const createdAt = new Date(photo.createdAt);
      const key = `${createdAt.getFullYear()}-${createdAt.getMonth()}`;
      const bucket = monthMap.get(key);

      if (!bucket) {
        continue;
      }

      bucket.posts += 1;
      bucket.engagement += (photo.likesCount ?? 0) + (photo.commentsCount ?? 0);
    }

    const maxPosts = Math.max(...months.map((item) => item.posts), 1);

    return months.map((item) => ({
      ...item,
      postPercent: Math.round((item.posts / maxPosts) * 100),
      engagementAvg: item.posts > 0 ? Math.round((item.engagement / item.posts) * 10) / 10 : 0,
    }));
  }, [scopedPhotos]);

  const cohortPerformance = useMemo(() => {
    const published = scopedPhotos.filter((photo) => photo.isPublished);
    const drafts = scopedPhotos.filter((photo) => !photo.isPublished);

    const publishedEngagement = published.reduce((sum, photo) => sum + (photo.likesCount ?? 0) + (photo.commentsCount ?? 0), 0);
    const publishedAvg = published.length > 0 ? Math.round((publishedEngagement / published.length) * 10) / 10 : 0;
    const draftTagCoverage =
      drafts.length > 0
        ? Math.round((drafts.filter((photo) => (photo.tags?.length ?? 0) >= 3).length / drafts.length) * 100)
        : 0;

    return {
      publishedCount: published.length,
      draftsCount: drafts.length,
      publishedAvg,
      draftTagCoverage,
    };
  }, [scopedPhotos]);

  const mediaTypePerformance = useMemo(() => {
    const published = photos.filter((photo) => photo.isPublished);

    const imagePosts = published.filter((photo) => photo.mediaType !== 'video');
    const videoPosts = published.filter((photo) => photo.mediaType === 'video');

    const imageEngagement = imagePosts.reduce((sum, photo) => sum + photo.likesCount + photo.commentsCount, 0);
    const videoEngagement = videoPosts.reduce((sum, photo) => sum + photo.likesCount + photo.commentsCount, 0);

    const imageAvg = imagePosts.length > 0 ? Math.round((imageEngagement / imagePosts.length) * 10) / 10 : 0;
    const videoAvg = videoPosts.length > 0 ? Math.round((videoEngagement / videoPosts.length) * 10) / 10 : 0;

    return {
      image: {
        count: imagePosts.length,
        avg: imageAvg,
      },
      video: {
        count: videoPosts.length,
        avg: videoAvg,
      },
    };
  }, [photos]);

  const phaseFiveGoals = useMemo(() => {
    const published = scopedPhotos.filter((photo) => photo.isPublished);
    const drafts = scopedPhotos.filter((photo) => !photo.isPublished);

    const avgEngagement =
      published.length > 0
        ? published.reduce((sum, photo) => sum + photo.likesCount + photo.commentsCount, 0) / published.length
        : 0;
    const strongTagCoverage =
      published.length > 0
        ? (published.filter((photo) => (photo.tags?.length ?? 0) >= 3).length / published.length) * 100
        : 0;
    const recentCount = [...published].filter(
      (photo) => Date.now() - new Date(photo.createdAt).getTime() <= 14 * 24 * 60 * 60 * 1000,
    ).length;

    return [
      {
        title: 'Portfolio baseline',
        description: 'Maintain at least 12 published moments.',
        completed: published.length >= 12,
      },
      {
        title: 'Draft hygiene',
        description: 'Keep draft queue to 3 or fewer.',
        completed: drafts.length <= 3,
      },
      {
        title: 'Engagement quality',
        description: 'Average at least 5 interactions per published post.',
        completed: avgEngagement >= 5,
      },
      {
        title: 'Tag consistency',
        description: 'At least 70% of published posts with 3+ tags.',
        completed: strongTagCoverage >= 70,
      },
      {
        title: 'Recency momentum',
        description: 'Publish at least 3 moments in the last 14 days.',
        completed: recentCount >= 3,
      },
    ];
  }, [scopedPhotos]);

  const snapshotSummary = useMemo(() => {
    const published = scopedPhotos.filter((photo) => photo.isPublished);
    const drafts = scopedPhotos.filter((photo) => !photo.isPublished);
    const likes = published.reduce((sum, photo) => sum + (photo.likesCount ?? 0), 0);
    const comments = published.reduce((sum, photo) => sum + (photo.commentsCount ?? 0), 0);
    const averageEngagement = published.length > 0 ? Math.round(((likes + comments) / published.length) * 10) / 10 : 0;

    return {
      total: scopedPhotos.length,
      published: published.length,
      drafts: drafts.length,
      likes,
      comments,
      averageEngagement,
    };
  }, [scopedPhotos]);

  const exportCsvSnapshot = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const rows = scopedPhotos.map((photo) => {
      const engagement = photo.likesCount + photo.commentsCount;
      const tags = (photo.tags ?? []).join('|');
      return [
        photo._id,
        photo.title.replaceAll('"', '""'),
        photo.isPublished ? 'published' : 'draft',
        photo.mediaType ?? 'image',
        String(photo.likesCount),
        String(photo.commentsCount),
        String(engagement),
        String(photo.tags?.length ?? 0),
        tags.replaceAll('"', '""'),
        new Date(photo.createdAt).toISOString(),
      ];
    });

    const header = ['id', 'title', 'status', 'mediaType', 'likes', 'comments', 'engagement', 'tagCount', 'tags', 'createdAt'];
    const lines = [header, ...rows].map((line) => line.map((cell) => `"${cell}"`).join(','));
    const csv = lines.join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creator-snapshot-${selectedRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [scopedPhotos, selectedRange]);

  const exportPdfSnapshot = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=980,height=720');
    if (!printWindow) {
      return;
    }

    const topItems = topPhotos
      .map((photo, index) => {
        const title = escapeHtml(photo.title);
        return `<li>${index + 1}. ${title} (${photo.likesCount} likes, ${photo.commentsCount} comments)</li>`;
      })
      .join('');

    const goals = phaseFiveGoals
      .map((goal) => `<li>${escapeHtml(goal.title)}: ${goal.completed ? 'Completed' : 'In progress'}</li>`)
      .join('');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>MOMENT Creator Snapshot</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 28px; color: #111; }
      h1 { margin: 0 0 6px; }
      h2 { margin: 18px 0 8px; font-size: 16px; }
      p { margin: 4px 0; }
      ul { margin: 8px 0; padding-left: 20px; }
      .muted { color: #555; font-size: 12px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .card { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
    </style>
  </head>
  <body>
    <h1>MOMENT Creator Performance Snapshot</h1>
    <p class="muted">Range: ${rangeLabel} | Generated: ${new Date().toLocaleString()}</p>
    <h2>Summary</h2>
    <div class="grid">
      <div class="card"><strong>Total Posts:</strong> ${snapshotSummary.total}</div>
      <div class="card"><strong>Published:</strong> ${snapshotSummary.published}</div>
      <div class="card"><strong>Drafts:</strong> ${snapshotSummary.drafts}</div>
      <div class="card"><strong>Avg Engagement:</strong> ${snapshotSummary.averageEngagement}</div>
    </div>
    <h2>Top Moments</h2>
    <ul>${topItems || '<li>No published moments in selected range.</li>'}</ul>
    <h2>Phase 5 Checklist</h2>
    <ul>${goals}</ul>
  </body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [phaseFiveGoals, rangeLabel, snapshotSummary, topPhotos]);

  const actionPlaybook = useMemo(() => {
    const published = photos.filter((photo) => photo.isPublished);
    const drafts = photos.filter((photo) => !photo.isPublished);
    const lowTagPublished = published.filter((photo) => (photo.tags?.length ?? 0) < 3).length;
    const lowEngagement = published.filter((photo) => photo.likesCount + photo.commentsCount < 3).length;

    return [
      {
        title: 'Clear draft backlog',
        hint: `${drafts.length} drafts pending review`,
        href: '/creator/my-photos?status=draft',
      },
      {
        title: 'Fix under-tagged posts',
        hint: `${lowTagPublished} published posts below 3 tags`,
        href: '/creator/my-photos?status=published&optimize=tags',
      },
      {
        title: 'Recover low engagement posts',
        hint: `${lowEngagement} posts need better copy or timing`,
        href: '/creator/my-photos?status=published&optimize=engagement',
      },
      {
        title: 'Promote top performers',
        hint: 'Focus your strongest moments first',
        href: '/creator/my-photos?status=published&sort=top',
      },
    ];
  }, [photos]);

  return (
    <main className="p-6 md:p-10">
      <section className="rounded-3xl border border-border bg-bg-card/70 p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Creator command center</p>
        <h1 className="mt-3 font-display text-4xl text-text-primary md:text-5xl">Performance cockpit</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Track momentum, prioritize your next move, and keep your publishing rhythm strong.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Range</p>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleRangeChange(option.key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                selectedRange === option.key
                  ? 'border-accent-gold bg-accent-gold/15 text-accent-gold'
                  : 'border-border text-text-secondary hover:border-accent-gold'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

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
          <button
            type="button"
            onClick={exportCsvSnapshot}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-accent-gold"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportPdfSnapshot}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-accent-gold"
          >
            <Printer size={15} />
            Export PDF
          </button>
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

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-border bg-bg-card/70 p-5">
          <div className="flex items-center gap-2 text-accent-gold">
            <TrendingUp size={16} />
            <p className="text-xs uppercase tracking-[0.14em]">Trend breakdown</p>
          </div>

          {tagTrendBreakdown.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">Add tags to recent posts and trend clusters will appear here.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {tagTrendBreakdown.map((item) => (
                <div key={item.tag} className="rounded-xl border border-border bg-black/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text-primary">#{item.tag}</p>
                    <p className="text-xs text-text-secondary">{item.engagement} interactions</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent-gold-dark via-accent-gold to-accent-gold-light" style={{ width: `${item.share}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{item.posts} recent posts • {item.share}% of latest uploads</p>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-border bg-bg-card/70 p-5">
          <div className="flex items-center gap-2 text-accent-gold">
            <Clock3 size={16} />
            <p className="text-xs uppercase tracking-[0.14em]">Best time to post</p>
          </div>
          <p className="mt-3 font-display text-3xl text-text-primary">{bestPostingWindow.label}</p>
          <p className="mt-2 text-sm text-text-secondary">{bestPostingWindow.hint}</p>
          <div className="mt-4 rounded-xl border border-border bg-black/20 px-3 py-3 text-xs text-text-secondary">
            Insight model: calculated from average interactions per posting hour across your published moments.
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-border bg-bg-card/70 p-5">
          <div className="flex items-center gap-2 text-accent-gold">
            <ChartColumn size={16} />
            <p className="text-xs uppercase tracking-[0.14em]">Monthly momentum</p>
          </div>
          <div className="mt-3 space-y-2">
            {monthlyMomentum.map((month) => (
              <div key={month.key} className="rounded-xl border border-border bg-black/20 px-3 py-3">
                <div className="flex items-center justify-between gap-2 text-xs text-text-secondary">
                  <span>{month.label}</span>
                  <span>{month.posts} posts • {month.engagementAvg} avg interactions</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent-gold-dark via-accent-gold to-accent-gold-light" style={{ width: `${month.postPercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-bg-card/70 p-5">
          <div className="flex items-center gap-2 text-accent-gold">
            <Camera size={16} />
            <p className="text-xs uppercase tracking-[0.14em]">Cohort performance</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Published</p>
              <p className="mt-1 font-display text-3xl text-text-primary">{cohortPerformance.publishedCount}</p>
              <p className="text-xs text-text-secondary">{cohortPerformance.publishedAvg} avg interactions</p>
            </div>
            <div className="rounded-xl border border-border bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Drafts</p>
              <p className="mt-1 font-display text-3xl text-text-primary">{cohortPerformance.draftsCount}</p>
              <p className="text-xs text-text-secondary">{cohortPerformance.draftTagCoverage}% ready with 3+ tags</p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-border bg-bg-card/70 p-5 xl:col-span-1">
          <div className="flex items-center gap-2 text-accent-gold">
            <Video size={16} />
            <p className="text-xs uppercase tracking-[0.14em]">Media split</p>
          </div>
          <div className="mt-3 space-y-3 text-sm">
            <div className="rounded-xl border border-border bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Image posts</p>
              <p className="mt-1 font-display text-2xl text-text-primary">{mediaTypePerformance.image.count}</p>
              <p className="text-xs text-text-secondary">{mediaTypePerformance.image.avg} avg interactions</p>
            </div>
            <div className="rounded-xl border border-border bg-black/20 p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">Video posts</p>
              <p className="mt-1 font-display text-2xl text-text-primary">{mediaTypePerformance.video.count}</p>
              <p className="text-xs text-text-secondary">{mediaTypePerformance.video.avg} avg interactions</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-bg-card/70 p-5 xl:col-span-1">
          <div className="flex items-center gap-2 text-accent-gold">
            <CheckCircle2 size={16} />
            <p className="text-xs uppercase tracking-[0.14em]">Phase 5 checklist</p>
          </div>
          <div className="mt-3 space-y-2">
            {phaseFiveGoals.map((goal) => (
              <div key={goal.title} className="rounded-xl border border-border bg-black/20 px-3 py-3">
                <p className="text-sm font-semibold text-text-primary">{goal.title}</p>
                <p className="mt-1 text-xs text-text-secondary">{goal.description}</p>
                <p className={`mt-1 text-xs font-semibold ${goal.completed ? 'text-success' : 'text-text-muted'}`}>
                  {goal.completed ? 'Completed' : 'In progress'}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-bg-card/70 p-5 xl:col-span-1">
          <div className="flex items-center gap-2 text-accent-gold">
            <ArrowUpRight size={16} />
            <p className="text-xs uppercase tracking-[0.14em]">Action playbook</p>
          </div>
          <div className="mt-3 space-y-2">
            {actionPlaybook.map((action) => (
              <Link key={action.title} href={action.href} className="block rounded-xl border border-border bg-black/20 px-3 py-3 transition hover:border-accent-gold">
                <p className="text-sm font-semibold text-text-primary">{action.title}</p>
                <p className="mt-1 text-xs text-text-secondary">{action.hint}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

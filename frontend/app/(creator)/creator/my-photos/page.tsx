'use client';

import { useQuery } from '@tanstack/react-query';
import { Camera, Sparkles, Upload } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useMemo } from 'react';

import { fetchCreatorPhotos } from '@/lib/consumer-api';
import { useAuthStore } from '@/store/authStore';

const getOptimizationScore = (photo: {
  title: string;
  caption: string;
  tags?: string[];
  location?: { name?: string };
  people?: string[];
}): number => {
  let score = 0;

  if (photo.title.trim().length >= 8) {
    score += 20;
  }

  if (photo.caption.trim().length >= 40) {
    score += 25;
  }

  score += Math.min(photo.tags?.length ?? 0, 5) * 8;

  if ((photo.location?.name ?? '').trim().length > 0) {
    score += 10;
  }

  score += Math.min(photo.people?.length ?? 0, 3) * 5;

  return Math.min(100, score);
};

export default function CreatorMyPhotosPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const searchParams = useSearchParams();

  const photosQuery = useQuery({
    queryKey: ['creator-my-photos', user?._id],
    queryFn: () => fetchCreatorPhotos(user?._id ?? '', 1, 30),
    enabled: Boolean(user?._id),
  });

  const photos = useMemo(() => photosQuery.data?.photos ?? [], [photosQuery.data?.photos]);

  const statusFilter = searchParams.get('status') ?? 'all';
  const optimizeFilter = searchParams.get('optimize') ?? 'none';
  const sortFilter = searchParams.get('sort') ?? 'newest';

  const getOptimizationTips = (photo: {
    title: string;
    caption: string;
    tags?: string[];
    location?: { name?: string };
    people?: string[];
    likesCount: number;
    commentsCount: number;
    isPublished?: boolean;
  }): string[] => {
    const tips: string[] = [];

    if ((photo.tags?.length ?? 0) < 3) {
      tips.push('Add at least 3 tags to increase discovery.');
    }

    if (photo.caption.trim().length < 40) {
      tips.push('Expand your caption with context to invite stronger engagement.');
    }

    if ((photo.location?.name ?? '').trim().length === 0) {
      tips.push('Set a location to boost trust and local relevance.');
    }

    if ((photo.people?.length ?? 0) === 0) {
      tips.push('Tag collaborators or subjects when relevant for better reach.');
    }

    const engagement = photo.likesCount + photo.commentsCount;
    if (photo.isPublished && engagement < 3) {
      tips.push('Low interaction so far. Consider reposting with a stronger opening line.');
    }

    if (tips.length === 0) {
      tips.push('Strong post quality. Keep this structure for future uploads.');
    }

    return tips.slice(0, 2);
  };

  const filteredPhotos = useMemo(() => {
    const statusFiltered = photos.filter((photo) => {
      if (statusFilter === 'published') {
        return Boolean(photo.isPublished);
      }

      if (statusFilter === 'draft') {
        return !photo.isPublished;
      }

      return true;
    });

    const optimizeFiltered = statusFiltered.filter((photo) => {
      if (optimizeFilter === 'tags') {
        return (photo.tags?.length ?? 0) < 3;
      }

      if (optimizeFilter === 'engagement') {
        return photo.isPublished && photo.likesCount + photo.commentsCount < 3;
      }

      return true;
    });

    const sorted = [...optimizeFiltered].sort((a, b) => {
      if (sortFilter === 'top') {
        return b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount);
      }

      if (sortFilter === 'optimization') {
        return getOptimizationScore(a) - getOptimizationScore(b);
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
  }, [optimizeFilter, photos, sortFilter, statusFilter]);

  const activeFilterPills = useMemo(() => {
    const pills: string[] = [];

    if (statusFilter !== 'all') {
      pills.push(`Status: ${statusFilter}`);
    }

    if (optimizeFilter !== 'none') {
      pills.push(`Optimization: ${optimizeFilter}`);
    }

    if (sortFilter !== 'newest') {
      pills.push(`Sort: ${sortFilter}`);
    }

    return pills;
  }, [optimizeFilter, sortFilter, statusFilter]);

  return (
    <main className="p-6 md:p-10">
      <h1 className="text-4xl font-display">My Photos</h1>
      <p className="mt-3 text-text-secondary">All your published and draft moments in one place.</p>

      {activeFilterPills.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilterPills.map((pill) => (
            <span key={pill} className="rounded-full border border-border bg-black/25 px-3 py-1 text-xs uppercase tracking-[0.12em] text-text-secondary">
              {pill}
            </span>
          ))}
          <Link href="/creator/my-photos" className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-accent-gold">
            Clear filters
          </Link>
        </div>
      ) : null}

      {photosQuery.isPending ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-2xl border border-border bg-bg-card" />
          ))}
        </section>
      ) : null}

      {!photosQuery.isPending && photos.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-border bg-bg-secondary/70 p-10 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-bg-card text-accent-gold">
            <Camera size={20} />
          </div>
          <p className="mt-4 font-display text-3xl text-text-primary">You haven&apos;t captured any moments yet</p>
          <p className="mt-2 text-sm text-text-secondary">Upload your first image and share your story with the community.</p>

          <Link
            href="/creator/upload"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-gold px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-gold-light"
          >
            <Upload size={16} />
            Upload your first moment
          </Link>
        </section>
      ) : null}

      {!photosQuery.isPending && filteredPhotos.length > 0 ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPhotos.map((photo) => (
            <article key={photo._id} className="overflow-hidden rounded-2xl border border-border bg-bg-card">
              <div className="relative h-52 w-full">
                {photo.mediaType === 'video' ? (
                  <video
                    src={photo.imageUrl}
                    poster={photo.thumbnailUrl || undefined}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image src={photo.thumbnailUrl || photo.imageUrl} alt={photo.title} fill className="object-cover" />
                )}
              </div>
              <div className="p-4">
                <p className="font-display text-2xl text-text-primary">{photo.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-text-muted">
                  {photo.isPublished ? 'Published' : 'Draft'}
                </p>

                <div className="mt-4 rounded-xl border border-border bg-black/20 px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-text-muted">
                      <Sparkles size={12} />
                      Optimization
                    </p>
                    <p className="text-xs font-semibold text-text-primary">{getOptimizationScore(photo)}/100</p>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-text-secondary">
                    {getOptimizationTips(photo).map((tip) => (
                      <li key={tip}>- {tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {!photosQuery.isPending && photos.length > 0 && filteredPhotos.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-border bg-bg-card/60 p-6 text-center">
          <p className="text-sm text-text-secondary">No photos match the current filters.</p>
          <Link href="/creator/my-photos" className="mt-3 inline-flex rounded-xl border border-border px-4 py-2 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-accent-gold">
            Reset and view all
          </Link>
        </section>
      ) : null}
    </main>
  );
}

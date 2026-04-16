'use client';

import { useQuery } from '@tanstack/react-query';
import { Camera, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { fetchCreatorPhotos } from '@/lib/consumer-api';
import { useAuthStore } from '@/store/authStore';

export default function CreatorMyPhotosPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  const photosQuery = useQuery({
    queryKey: ['creator-my-photos', user?._id],
    queryFn: () => fetchCreatorPhotos(user?._id ?? '', 1, 30),
    enabled: Boolean(user?._id),
  });

  const photos = photosQuery.data?.photos ?? [];

  return (
    <main className="p-6 md:p-10">
      <h1 className="text-4xl font-display">My Photos</h1>
      <p className="mt-3 text-text-secondary">All your published and draft moments in one place.</p>

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

      {!photosQuery.isPending && photos.length > 0 ? (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((photo) => (
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
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}

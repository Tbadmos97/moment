'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart, MapPin, Share2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import CommentSection from '@/components/consumer/CommentSection';
import { fetchPhotoById, likePhotoRequest, unlikePhotoRequest } from '@/lib/consumer-api';
import type { Photo } from '@/types';

export default function PhotoDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [zoomed, setZoomed] = useState(false);

  const photoQuery = useQuery({
    queryKey: ['photo-detail', id],
    queryFn: () => fetchPhotoById(id),
    enabled: Boolean(id),
  });

  const photo = photoQuery.data;

  const likeMutation = useMutation({
    mutationFn: async ({ nextLiked }: { nextLiked: boolean }) => {
      return nextLiked ? likePhotoRequest(id) : unlikePhotoRequest(id);
    },
    onMutate: async ({ nextLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['photo-detail', id] });
      const previous = queryClient.getQueryData<Photo>(['photo-detail', id]);

      queryClient.setQueryData<Photo>(['photo-detail', id], (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          isLiked: nextLiked,
          likesCount: Math.max(0, current.likesCount + (nextLiked ? 1 : -1)),
        };
      });

      return { previous };
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Photo>(['photo-detail', id], (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          isLiked: data.liked,
          likesCount: data.likesCount,
        };
      });

      void queryClient.invalidateQueries({ queryKey: ['consumer-feed'] });
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['photo-detail', id], context.previous);
      }

      toast.error('Could not update like right now.');
    },
  });

  const people = useMemo(() => photo?.people?.filter(Boolean).slice(0, 6) ?? [], [photo?.people]);

  if (photoQuery.isPending) {
    return (
      <main className="mx-auto grid min-h-[80vh] w-full max-w-[1400px] grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[65%_35%] lg:px-8">
        <div className="h-[60vh] animate-pulse rounded-3xl bg-bg-card" />
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-bg-card" />
          <div className="h-40 animate-pulse rounded-2xl bg-bg-card" />
          <div className="h-72 animate-pulse rounded-2xl bg-bg-card" />
        </div>
      </main>
    );
  }

  if (!photo) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 text-center">
        <div>
          <p className="font-display text-4xl text-text-primary">Moment not found</p>
          <p className="mt-3 text-sm text-text-secondary">This photo may have been removed or set to private.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto grid min-h-[80vh] w-full max-w-[1400px] grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[65%_35%] lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-black/25 p-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setZoomed((value) => !value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setZoomed((value) => !value);
            }
          }}
          className="relative h-[65vh] overflow-hidden rounded-2xl bg-bg-card lg:h-[82vh]"
        >
          <motion.img
            src={photo.imageUrl}
            alt={photo.title}
            animate={{ scale: zoomed ? 1.22 : 1 }}
            transition={{ duration: 0.4 }}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/85">
            Tap to zoom
          </div>
        </div>
      </section>

      <aside className="relative flex max-h-[86vh] flex-col overflow-hidden rounded-3xl border border-border/70 bg-bg-secondary/80">
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-black/25 p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-bg-card">
                {photo.creator.avatar ? (
                  <img src={photo.creator.avatar} alt={photo.creator.username} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs uppercase text-text-secondary">
                    {photo.creator.username.slice(0, 2)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">@{photo.creator.username}</p>
                <p className="text-xs text-text-muted">Creator</p>
              </div>
            </div>
            <button type="button" className="rounded-full border border-accent-gold/60 px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-accent-gold">
              Follow
            </button>
          </div>

          <section>
            <h1 className="font-display text-4xl text-text-primary">{photo.title}</h1>
            {photo.caption ? <p className="mt-3 text-sm leading-relaxed text-text-secondary">{photo.caption}</p> : null}
            {photo.location?.name ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-text-secondary">
                <MapPin size={13} />
                {photo.location.name}
              </p>
            ) : null}
          </section>

          {people.length > 0 ? (
            <section>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-text-muted">People</p>
              <div className="flex flex-wrap items-center gap-2">
                {people.map((person, index) => (
                  <span key={`${person}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-black/20 px-3 py-1.5 text-xs text-text-secondary">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg-card text-[10px] uppercase text-accent-gold">
                      {person.slice(0, 1)}
                    </span>
                    {person}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {photo.tags?.length ? (
            <section>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-text-muted">Tags</p>
              <div className="flex flex-wrap gap-2">
                {photo.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-border bg-black/20 px-3 py-1 text-xs uppercase tracking-[0.12em] text-text-secondary">
                    #{tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-black/20 p-3 text-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Views</p>
              <p className="mt-1 text-xl text-text-primary">{photo.viewsCount ?? 0}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Likes</p>
              <p className="mt-1 text-xl text-text-primary">{photo.likesCount}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-text-muted">Comments</p>
              <p className="mt-1 text-xl text-text-primary">{photo.commentsCount}</p>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => likeMutation.mutate({ nextLiked: !Boolean(photo.isLiked) })}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm transition ${
                photo.isLiked ? 'bg-red-500 text-white' : 'bg-accent-gold text-black hover:bg-accent-gold-light'
              }`}
            >
              <Heart size={16} className={photo.isLiked ? 'fill-white' : ''} />
              {photo.isLiked ? 'Liked' : 'Like'}
            </button>

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied to clipboard.');
                } catch {
                  toast.error('Unable to copy link.');
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-black/20 px-4 py-3 text-sm text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>

          <section>
            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-text-muted">Comments</p>
            <CommentSection photoId={id} photoCreatorId={photo.creator._id} initialComments={photo.comments ?? []} />
          </section>
        </div>
      </aside>
    </main>
  );
}

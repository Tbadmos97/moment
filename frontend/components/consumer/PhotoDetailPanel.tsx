'use client';

import { Heart, MapPin, Share2 } from 'lucide-react';
import Image from 'next/image';
import { lazy, Suspense, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { Photo } from '@/types';

const LazyCommentSection = lazy(() => import('@/components/consumer/CommentSection'));

type PhotoDetailPanelProps = {
  photo: Photo;
  photoId: string;
  isLiking: boolean;
  onToggleLike: (nextLiked: boolean) => void;
};

export default function PhotoDetailPanel({ photo, photoId, isLiking, onToggleLike }: PhotoDetailPanelProps): JSX.Element {
  const [expandedCaption, setExpandedCaption] = useState(false);

  const allPeople = photo.people?.filter(Boolean) ?? [];
  const visiblePeople = allPeople.slice(0, 3);
  const hiddenPeopleCount = Math.max(0, allPeople.length - visiblePeople.length);

  const captionTooLong = (photo.caption?.length ?? 0) > 200;
  const displayCaption = useMemo(() => {
    if (!photo.caption) {
      return '';
    }

    if (expandedCaption || !captionTooLong) {
      return photo.caption;
    }

    return `${photo.caption.slice(0, 200).trimEnd()}...`;
  }, [captionTooLong, expandedCaption, photo.caption]);

  return (
    <aside className="relative flex max-h-[86vh] flex-col overflow-hidden rounded-3xl border border-border/70 bg-bg-secondary/80">
      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-black/25 p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-bg-card">
              {photo.creator.avatar ? (
                <Image src={photo.creator.avatar} alt={photo.creator.username} width={40} height={40} className="h-full w-full object-cover" />
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
        </div>

        <section>
          <h1 className="font-display text-4xl text-text-primary">{photo.title}</h1>
          {photo.caption ? (
            <div className="mt-3">
              <p className="text-sm leading-relaxed text-text-secondary">{displayCaption}</p>
              {captionTooLong ? (
                <button
                  type="button"
                  onClick={() => setExpandedCaption((value) => !value)}
                  className="mt-2 text-xs uppercase tracking-[0.14em] text-accent-gold"
                >
                  {expandedCaption ? 'Show less' : 'Show more'}
                </button>
              ) : null}
            </div>
          ) : null}
          {photo.location?.name ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-text-secondary">
              <MapPin size={13} />
              {photo.location.name}
            </p>
          ) : null}
        </section>

        {allPeople.length > 0 ? (
          <section>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-text-muted">People</p>
            <div className="flex flex-wrap items-center gap-2">
              {visiblePeople.map((person, index) => (
                <span key={`${person}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-black/20 px-3 py-1.5 text-xs text-text-secondary">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-bg-card text-[10px] uppercase text-accent-gold">
                    {person.slice(0, 1)}
                  </span>
                  {person}
                </span>
              ))}

              {hiddenPeopleCount > 0 ? (
                <span className="inline-flex items-center rounded-full border border-border bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-text-muted">
                  +{hiddenPeopleCount} more
                </span>
              ) : null}
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
            onClick={() => onToggleLike(!Boolean(photo.isLiked))}
            disabled={isLiking}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm transition disabled:opacity-60 ${
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
          <Suspense
            fallback={
              <div className="space-y-3 rounded-2xl border border-border/70 bg-black/20 p-4">
                <div className="h-4 w-24 animate-pulse rounded bg-bg-card" />
                <div className="h-10 w-full animate-pulse rounded bg-bg-card" />
                <div className="h-10 w-full animate-pulse rounded bg-bg-card" />
              </div>
            }
          >
            <LazyCommentSection photoId={photoId} photoCreatorId={photo.creator._id} initialComments={photo.comments ?? []} />
          </Suspense>
        </section>
      </div>
    </aside>
  );
}

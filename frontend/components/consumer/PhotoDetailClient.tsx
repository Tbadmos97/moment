'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useMemo, useState, lazy, Suspense } from 'react';
import toast from 'react-hot-toast';

import { fetchPhotoById, likePhotoRequest, unlikePhotoRequest } from '@/lib/consumer-api';
import type { Photo } from '@/types';

const LazyPhotoDetailPanel = lazy(() => import('@/components/consumer/PhotoDetailPanel'));

type PhotoDetailClientProps = {
  photoId: string;
  initialPhoto?: Photo;
};

export default function PhotoDetailClient({ photoId, initialPhoto }: PhotoDetailClientProps): JSX.Element {
  const queryClient = useQueryClient();
  const [zoomed, setZoomed] = useState(false);

  const photoQuery = useQuery({
    queryKey: ['photo-detail', photoId],
    queryFn: () => fetchPhotoById(photoId),
    initialData: initialPhoto,
    enabled: Boolean(photoId),
    refetchInterval: 30_000,
  });

  const photo = photoQuery.data;
  const isVideo = photo?.mediaType === 'video';

  const likeMutation = useMutation({
    mutationFn: async ({ nextLiked }: { nextLiked: boolean }) => {
      return nextLiked ? likePhotoRequest(photoId) : unlikePhotoRequest(photoId);
    },
    onMutate: async ({ nextLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['photo-detail', photoId] });
      const previous = queryClient.getQueryData<Photo>(['photo-detail', photoId]);

      queryClient.setQueryData<Photo>(['photo-detail', photoId], (current) => {
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
      queryClient.setQueryData<Photo>(['photo-detail', photoId], (current) => {
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
      void queryClient.invalidateQueries({ queryKey: ['search-feed'] });
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['photo-detail', photoId], context.previous);
      }

      toast.error('Could not update like right now.');
    },
  });

  const aspectClass = useMemo(() => {
    const width = photo?.width ?? 1;
    const height = photo?.height ?? 1;
    const ratio = height / width;

    if (ratio >= 1.35) {
      return 'object-contain';
    }

    return 'object-cover';
  }, [photo?.height, photo?.width]);

  if (photoQuery.isPending || !photo) {
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

  return (
    <main className="mx-auto grid min-h-[80vh] w-full max-w-[1400px] grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-[65%_35%] lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-black/25 p-3">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!isVideo) {
              setZoomed((value) => !value);
            }
          }}
          onKeyDown={(event) => {
            if (!isVideo && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              setZoomed((value) => !value);
            }
          }}
          className="relative h-[65vh] overflow-hidden rounded-2xl bg-bg-card lg:h-[82vh]"
        >
          {isVideo ? (
            <video
              src={photo.imageUrl}
              poster={photo.thumbnailUrl || undefined}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            />
          ) : (
            <>
              <motion.div
                animate={{ scale: zoomed ? 1.15 : 1 }}
                transition={{ duration: 0.4 }}
                className="relative h-full w-full"
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className={aspectClass}
                />
              </motion.div>
              <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/85">
                Tap to zoom
              </div>
            </>
          )}
        </div>
      </section>

      <Suspense
        fallback={
          <aside className="space-y-3 rounded-3xl border border-border/70 bg-bg-secondary/80 p-5">
            <div className="h-12 animate-pulse rounded bg-bg-card" />
            <div className="h-24 animate-pulse rounded bg-bg-card" />
            <div className="h-56 animate-pulse rounded bg-bg-card" />
          </aside>
        }
      >
        <LazyPhotoDetailPanel
          photo={photo}
          photoId={photoId}
          isLiking={likeMutation.isPending}
          onToggleLike={(nextLiked) => likeMutation.mutate({ nextLiked })}
        />
      </Suspense>
    </main>
  );
}

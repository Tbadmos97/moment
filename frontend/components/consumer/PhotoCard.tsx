'use client';

import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { fetchPhotoById } from '@/lib/consumer-api';
import type { Photo } from '@/types';

type PhotoCardProps = {
  photo: Photo;
  index: number;
  onToggleLike: (photoId: string, nextLiked: boolean) => Promise<void>;
};

export function PhotoCardSkeleton({ index }: { index: number }): JSX.Element {
  const height = 260 + ((index % 4) * 44);

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl bg-bg-card" style={{ height }}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </div>
  );
}

export default function PhotoCard({ photo, index, onToggleLike }: PhotoCardProps): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLiking, setIsLiking] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [liked, setLiked] = useState(Boolean(photo.isLiked));
  const [likesCount, setLikesCount] = useState(photo.likesCount);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const displayImage = photo.imageUrl || photo.thumbnailUrl;
  const isVideo = photo.mediaType === 'video';

  const aspectPadding = useMemo(() => {
    const width = photo.width ?? 1;
    const height = photo.height ?? 1;
    const ratio = Math.max(Math.min((height / width) * 100, 180), 70);
    return `${ratio}%`;
  }, [photo.height, photo.width]);

  useEffect(() => {
    setMediaLoaded(false);
  }, [photo._id]);

  const onLikeClick = async (event: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    event.stopPropagation();

    if (isLiking) {
      return;
    }

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));
    setIsLiking(true);

    try {
      await onToggleLike(photo._id, nextLiked);
      if (nextLiked) {
        setShowBurst(true);
        window.setTimeout(() => setShowBurst(false), 700);
      }
    } catch {
      setLiked((value) => !value);
      setLikesCount((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group mb-4 cursor-zoom-in overflow-hidden rounded-2xl"
      onClick={() => router.push(`/photos/${photo._id}`)}
      onMouseEnter={() => {
        void queryClient.prefetchQuery({
          queryKey: ['photo-detail', photo._id],
          queryFn: () => fetchPhotoById(photo._id),
          staleTime: 30_000,
        });
      }}
    >
      <div className="relative w-full" style={{ paddingBottom: aspectPadding }}>
        {!mediaLoaded ? (
          <div className="absolute inset-0 z-[1] bg-bg-card">
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          </div>
        ) : null}

        {isVideo ? (
          <video
            src={photo.imageUrl}
            poster={photo.thumbnailUrl || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedData={() => setMediaLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <Image
            src={displayImage}
            alt={photo.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={index < 4}
            onLoad={() => setMediaLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {isVideo ? (
          <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/30 bg-black/45 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white">
            Video
          </div>
        ) : null}

        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
        >
          <div className="absolute inset-x-0 bottom-0 p-4">
            <motion.h3
              initial={{ y: 10, opacity: 0 }}
              whileHover={{ y: 0, opacity: 1 }}
              className="font-display text-2xl text-white"
            >
              {photo.title}
            </motion.h3>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 overflow-hidden rounded-full border border-white/30 bg-white/10">
                  {photo.creator?.avatar ? (
                    <Image
                      src={photo.creator.avatar}
                      alt={photo.creator.username}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs uppercase text-white">
                      {photo.creator?.username?.slice(0, 2) || 'MO'}
                    </div>
                  )}
                </div>
                <p className="text-sm text-white/90">@{photo.creator?.username}</p>
              </div>

              <button
                type="button"
                onClick={onLikeClick}
                className="relative flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-sm text-white transition hover:-translate-y-[1px] hover:shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
              >
                <Heart size={16} className={`transition ${liked ? 'animate-likeBounce fill-red-500 text-red-500' : 'text-white'}`} />
                {likesCount}

                {showBurst ? (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    {Array.from({ length: 6 }).map((_, piece) => (
                      <span
                        key={piece}
                        className="absolute h-1.5 w-1.5 rounded-full bg-red-400/80 animate-likeParticle"
                        style={{
                          transform: `rotate(${piece * 60}deg) translateY(-12px)`,
                          animationDelay: `${piece * 0.03}s`,
                        }}
                      />
                    ))}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.article>
  );
}

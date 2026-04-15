'use client';

import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

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
  const [liked, setLiked] = useState(Boolean(photo.isLiked));
  const [likesCount, setLikesCount] = useState(photo.likesCount);

  const displayImage = photo.imageUrl || photo.thumbnailUrl;

  const aspectPadding = useMemo(() => {
    const width = photo.width ?? 1;
    const height = photo.height ?? 1;
    const ratio = Math.max(Math.min((height / width) * 100, 180), 70);
    return `${ratio}%`;
  }, [photo]);

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
        <Image
          src={displayImage}
          alt={photo.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={index < 4}
          className="absolute inset-0 h-full w-full object-cover"
        />

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
                className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-sm text-white"
              >
                <Heart size={16} className={`transition ${liked ? 'scale-110 fill-red-500 text-red-500' : 'text-white'}`} />
                {likesCount}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.article>
  );
}

'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { useEffect, useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';

import PhotoCard, { PhotoCardSkeleton } from '@/components/consumer/PhotoCard';
import { fetchPhotos, fetchTrendingTags, likePhotoRequest, unlikePhotoRequest, type FeedSort, type PhotoFeedPayload } from '@/lib/consumer-api';
import type { Photo } from '@/types';

const tabs: FeedSort[] = ['latest', 'popular', 'trending'];

const masonryBreakpoints = {
  default: 4,
  1280: 3,
  900: 2,
  640: 2,
};

export default function ConsumerFeedPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<FeedSort>('latest');
  const [activeTag, setActiveTag] = useState<string | undefined>();
  const { ref, inView } = useInView({ rootMargin: '400px' });

  const trendingTagsQuery = useQuery({
    queryKey: ['trending-tags'],
    queryFn: fetchTrendingTags,
  });

  const photosQuery = useInfiniteQuery({
    queryKey: ['consumer-feed', sort, activeTag],
    queryFn: ({ pageParam }) =>
      fetchPhotos({
        pageParam: pageParam as number,
        limit: 20,
        sort,
        tag: activeTag,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  useEffect(() => {
    if (!inView || !photosQuery.hasNextPage || photosQuery.isFetchingNextPage) {
      return;
    }

    void photosQuery.fetchNextPage();
  }, [inView, photosQuery]);

  const photos = useMemo(() => photosQuery.data?.pages.flatMap((page) => page.photos ?? []) ?? [], [photosQuery.data?.pages]);

  const likeMutation = useMutation({
    mutationFn: async ({ photoId, nextLiked }: { photoId: string; nextLiked: boolean }) => {
      return nextLiked ? likePhotoRequest(photoId) : unlikePhotoRequest(photoId);
    },
    onMutate: async ({ photoId, nextLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['consumer-feed'] });

      const previousStates = queryClient.getQueriesData({ queryKey: ['consumer-feed'] });

      previousStates.forEach(([key]) => {
        queryClient.setQueryData(key, (oldData: { pages: PhotoFeedPayload[]; pageParams: number[] } | undefined) => {
          if (!oldData) {
            return oldData;
          }

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              photos: (page.photos ?? []).map((photo) =>
                photo._id === photoId
                  ? {
                      ...photo,
                      isLiked: nextLiked,
                      likesCount: Math.max(0, photo.likesCount + (nextLiked ? 1 : -1)),
                    }
                  : photo,
              ),
            })),
          };
        });
      });

      return { previousStates };
    },
    onError: (_error, _variables, context) => {
      context?.previousStates?.forEach(([key, value]) => {
        queryClient.setQueryData(key, value);
      });
      toast.error('Unable to update like right now.');
    },
    onSuccess: (data, variables) => {
      queryClient.setQueriesData({ queryKey: ['consumer-feed'] }, (oldData: { pages: PhotoFeedPayload[]; pageParams: number[] } | undefined) => {
        if (!oldData) {
          return oldData;
        }

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            photos: (page.photos ?? []).map((photo) =>
              photo._id === variables.photoId
                ? {
                    ...photo,
                    isLiked: data.liked,
                    likesCount: data.likesCount,
                  }
                : photo,
            ),
          })),
        };
      });
    },
  });

  const onToggleLike = async (photoId: string, nextLiked: boolean): Promise<void> => {
    await likeMutation.mutateAsync({ photoId, nextLiked });
  };

  const isLoading = photosQuery.isPending;
  const empty = !isLoading && photos.length === 0;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="mb-8">
        <p className="text-xs uppercase tracking-[0.24em] text-accent-gold">Cinematic Discovery</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-display leading-tight text-text-primary sm:text-5xl">
          A living gallery of people, places, and fleeting light.
        </h1>
      </section>

      <section className="mb-6">
        <div className="relative flex w-full max-w-md items-center gap-2 rounded-full border border-border/80 bg-black/30 p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSort(tab)}
              className={`relative z-10 flex-1 rounded-full px-4 py-2 text-sm capitalize transition ${
                sort === tab ? 'text-black' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="absolute top-1 h-[calc(100%-8px)] rounded-full bg-accent-gold"
            style={{
              width: `calc((100% - 8px) / ${tabs.length})`,
              left: `calc(4px + ((100% - 8px) / ${tabs.length}) * ${tabs.indexOf(sort)})`,
            }}
          />
        </div>
      </section>

      <section className="mb-8 overflow-x-auto">
        <div className="flex min-w-max items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => setActiveTag(undefined)}
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.16em] transition ${
              !activeTag ? 'border-accent-gold bg-accent-gold/15 text-accent-gold' : 'border-border text-text-secondary hover:border-accent-gold/50'
            }`}
          >
            All
          </button>

          {(trendingTagsQuery.data ?? []).map((item) => (
            <button
              key={item.tag}
              type="button"
              onClick={() => setActiveTag((current) => (current === item.tag ? undefined : item.tag))}
              className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.16em] transition ${
                activeTag === item.tag
                  ? 'border-accent-gold bg-accent-gold/15 text-accent-gold'
                  : 'border-border text-text-secondary hover:border-accent-gold/60 hover:text-accent-gold'
              }`}
            >
              #{item.tag}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <Masonry breakpointCols={masonryBreakpoints} className="masonry-grid" columnClassName="masonry-grid_column">
          {Array.from({ length: 16 }).map((_, index) => (
            <PhotoCardSkeleton key={`skeleton-${index}`} index={index} />
          ))}
        </Masonry>
      ) : null}

      {!isLoading ? (
        <Masonry breakpointCols={masonryBreakpoints} className="masonry-grid" columnClassName="masonry-grid_column">
          {photos.map((photo, index) => (
            <PhotoCard key={photo._id} photo={photo as Photo} index={index} onToggleLike={onToggleLike} />
          ))}
        </Masonry>
      ) : null}

      {empty ? (
        <div className="mt-12 rounded-3xl border border-border/80 bg-black/20 px-8 py-14 text-center">
          <p className="font-display text-3xl text-text-primary">No moments here yet</p>
          <p className="mt-3 text-sm text-text-secondary">Try changing the sort mode or pick a different tag to uncover hidden stories.</p>
        </div>
      ) : null}

      <div ref={ref} className="pt-6 text-center text-xs uppercase tracking-[0.16em] text-text-muted">
        {photosQuery.isFetchingNextPage
          ? 'Loading more moments...'
          : photosQuery.hasNextPage
            ? 'Scroll for more'
            : photos.length > 0
              ? 'You reached the end'
              : ''}
      </div>
    </main>
  );
}

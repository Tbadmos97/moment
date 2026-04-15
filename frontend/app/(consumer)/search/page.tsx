'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Masonry from 'react-masonry-css';
import { Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import PhotoCard, { PhotoCardSkeleton } from '@/components/consumer/PhotoCard';
import { fetchPhotos, likePhotoRequest, unlikePhotoRequest } from '@/lib/consumer-api';
import type { Photo } from '@/types';

const STORAGE_KEY = 'moment-recent-searches';

const masonryBreakpoints = {
  default: 4,
  1280: 3,
  900: 2,
  640: 2,
};

const emptyIllustration = `
<svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="70" cy="70" r="62" stroke="#2A2A2A" stroke-width="2"/>
  <circle cx="70" cy="58" r="21" stroke="#C9A84C" stroke-width="2"/>
  <path d="M35 102C43 90.2 55.4 83 70 83C84.6 83 97 90.2 105 102" stroke="#AAAAAA" stroke-width="2" stroke-linecap="round"/>
  <circle cx="62" cy="56" r="2" fill="#C9A84C"/>
  <circle cx="78" cy="56" r="2" fill="#C9A84C"/>
</svg>`;

export default function SearchPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [term, setTerm] = useState(initialQuery);
  const [submittedTerm, setSubmittedTerm] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as string[];
      setRecentSearches(parsed.slice(0, 8));
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const searchQuery = useInfiniteQuery({
    queryKey: ['search-feed', submittedTerm],
    queryFn: ({ pageParam }) =>
      fetchPhotos({
        pageParam: pageParam as number,
        limit: 20,
        sort: 'latest',
        search: submittedTerm,
      }),
    enabled: submittedTerm.trim().length > 0,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const photos = useMemo(() => searchQuery.data?.pages.flatMap((page) => page.photos ?? []) ?? [], [searchQuery.data?.pages]);

  const persistRecent = (value: string): void => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setRecentSearches((current) => {
      const next = [normalized, ...current.filter((item) => item !== normalized)].slice(0, 8);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const normalized = term.trim();
    setSubmittedTerm(normalized);
    persistRecent(normalized);
    router.replace(`/search?q=${encodeURIComponent(normalized)}`);
  };

  const likeMutation = useMutation({
    mutationFn: async ({ photoId, nextLiked }: { photoId: string; nextLiked: boolean }) =>
      nextLiked ? likePhotoRequest(photoId) : unlikePhotoRequest(photoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['search-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['consumer-feed'] });
    },
  });

  const onToggleLike = async (photoId: string, nextLiked: boolean): Promise<void> => {
    await likeMutation.mutateAsync({ photoId, nextLiked });
  };

  const showEmpty = submittedTerm.trim().length > 0 && !searchQuery.isPending && photos.length === 0;

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="mb-7">
        <form onSubmit={onSubmit} className="relative">
          <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by title, mood, tag"
            autoFocus
            className="h-16 w-full rounded-full border border-border bg-black/35 pl-14 pr-6 text-lg text-text-primary outline-none transition focus:border-accent-gold"
          />
        </form>

        {recentSearches.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTerm(item);
                  setSubmittedTerm(item);
                  router.replace(`/search?q=${encodeURIComponent(item)}`);
                }}
                className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.14em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
              >
                {item}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {searchQuery.isPending ? (
        <Masonry breakpointCols={masonryBreakpoints} className="masonry-grid" columnClassName="masonry-grid_column">
          {Array.from({ length: 12 }).map((_, index) => (
            <PhotoCardSkeleton key={index} index={index} />
          ))}
        </Masonry>
      ) : null}

      {!searchQuery.isPending ? (
        <Masonry breakpointCols={masonryBreakpoints} className="masonry-grid" columnClassName="masonry-grid_column">
          {photos.map((photo, index) => (
            <PhotoCard key={photo._id} photo={photo as Photo} index={index} onToggleLike={onToggleLike} />
          ))}
        </Masonry>
      ) : null}

      {showEmpty ? (
        <div className="mt-12 rounded-3xl border border-border/80 bg-black/20 px-8 py-12 text-center">
          <div className="mx-auto w-[140px]" dangerouslySetInnerHTML={{ __html: emptyIllustration }} />
          <h2 className="mt-4 font-display text-3xl text-text-primary">No results found</h2>
          <p className="mt-2 text-sm text-text-secondary">Try another phrase, a broader word, or explore trending tags from the feed.</p>
        </div>
      ) : null}

      <div className="pt-6 text-center">
        {searchQuery.hasNextPage ? (
          <button
            type="button"
            onClick={() => void searchQuery.fetchNextPage()}
            disabled={searchQuery.isFetchingNextPage}
            className="rounded-full border border-border bg-bg-card px-5 py-2 text-xs uppercase tracking-[0.16em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold disabled:opacity-60"
          >
            {searchQuery.isFetchingNextPage ? 'Loading more results...' : 'Load more'}
          </button>
        ) : null}
      </div>
    </main>
  );
}

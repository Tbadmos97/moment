'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Send, Star } from 'lucide-react';
import { KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';

import { createCommentRequest, fetchComments } from '@/lib/consumer-api';
import { useAuthStore } from '@/store/authStore';
import type { Comment } from '@/types';

type CommentSectionProps = {
  photoId: string;
  initialComments: Comment[];
};

export default function CommentSection({ photoId, initialComments }: CommentSectionProps): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [rating, setRating] = useState<number | undefined>();
  const { ref, inView } = useInView({ threshold: 0, rootMargin: '120px' });

  const commentsQuery = useInfiniteQuery({
    queryKey: ['photo-comments', photoId],
    queryFn: ({ pageParam }) => fetchComments(photoId, pageParam as number, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialData: {
      pages: [
        {
          comments: initialComments,
          page: 1,
          limit: 10,
          totalPages: initialComments.length > 0 ? 2 : 1,
          total: initialComments.length,
          hasMore: initialComments.length >= 10,
        },
      ],
      pageParams: [1],
    },
  });

  const comments = useMemo(
    () => commentsQuery.data?.pages.flatMap((page) => page.comments) ?? initialComments,
    [commentsQuery.data?.pages, initialComments],
  );

  useEffect(() => {
    if (!inView || !commentsQuery.hasNextPage || commentsQuery.isFetchingNextPage) {
      return;
    }

    void commentsQuery.fetchNextPage();
  }, [commentsQuery, inView]);

  const mutation = useMutation({
    mutationFn: (payload: { text: string; rating?: number }) => createCommentRequest(photoId, payload),
    onMutate: async (payload) => {
      const optimisticComment: Comment = {
        _id: `optimistic-${Date.now()}`,
        text: payload.text,
        rating: payload.rating,
        photo: photoId,
        createdAt: new Date().toISOString(),
        author: {
          _id: user?._id || 'self',
          username: user?.username || 'you',
          avatar: user?.avatar,
          role: user?.role || 'consumer',
        },
      };

      await queryClient.cancelQueries({ queryKey: ['photo-comments', photoId] });
      const previous = queryClient.getQueryData(['photo-comments', photoId]);

      queryClient.setQueryData(
        ['photo-comments', photoId],
        (oldData: { pages: Array<{ comments: Comment[] }>; pageParams: number[] } | undefined) => {
          if (!oldData) {
            return oldData;
          }

          const firstPage = oldData.pages[0];
          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                comments: [optimisticComment, ...(firstPage.comments || [])],
              },
              ...oldData.pages.slice(1),
            ],
          };
        },
      );

      return { previous };
    },
    onSuccess: () => {
      setDraft('');
      setRating(undefined);
      void queryClient.invalidateQueries({ queryKey: ['photo-comments', photoId] });
      void queryClient.invalidateQueries({ queryKey: ['photo-detail', photoId] });
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['photo-comments', photoId], context.previous);
      }
      toast.error('Unable to post comment right now.');
    },
  });

  const submitComment = (): void => {
    const text = draft.trim();

    if (!text) {
      return;
    }

    mutation.mutate({ text, rating });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitComment();
  };

  return (
    <div className="relative">
      <div className="space-y-4 pb-24">
        {comments.map((comment) => (
          <article key={comment._id} className="rounded-xl border border-border/80 bg-black/25 p-3">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-full border border-border/80 bg-bg-card">
                {comment.author.avatar ? (
                  <img src={comment.author.avatar} alt={comment.author.username} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs uppercase text-text-secondary">
                    {comment.author.username.slice(0, 2)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-text-primary">@{comment.author.username}</p>
                  <p className="text-xs text-text-muted">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</p>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{comment.text}</p>
                {comment.rating ? (
                  <p className="mt-2 flex items-center gap-1 text-xs text-accent-gold">
                    {Array.from({ length: comment.rating }).map((_, index) => (
                      <Star key={`${comment._id}-${index}`} size={12} className="fill-accent-gold text-accent-gold" />
                    ))}
                  </p>
                ) : null}
              </div>
            </div>
          </article>
        ))}

        {commentsQuery.hasNextPage ? (
          <div ref={ref} className="rounded-xl border border-dashed border-border px-4 py-3 text-center text-xs text-text-muted">
            {commentsQuery.isFetchingNextPage ? 'Loading more comments...' : 'Scroll to load more comments'}
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-0 mt-4 rounded-2xl border border-border/80 bg-bg-secondary/95 p-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const value = index + 1;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value === rating ? undefined : value)}
                className="text-text-muted transition hover:text-accent-gold"
                aria-label={`Rate ${value} stars`}
              >
                <Star size={14} className={value <= (rating ?? 0) ? 'fill-accent-gold text-accent-gold' : ''} />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a thoughtful comment"
            className="h-11 flex-1 rounded-full border border-border/80 bg-black/25 px-4 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-gold"
          />
          <button
            type="button"
            onClick={submitComment}
            disabled={mutation.isPending || draft.trim().length === 0}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent-gold text-black transition hover:bg-accent-gold-light disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send comment"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

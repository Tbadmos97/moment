'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Star } from 'lucide-react';
import { ChangeEvent, KeyboardEvent, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';

import CommentItem from '@/components/consumer/CommentItem';
import RatingSummary from '@/components/consumer/RatingSummary';
import { createCommentRequest, deleteCommentRequest, fetchComments } from '@/lib/consumer-api';
import { useAuthStore } from '@/store/authStore';
import type { Comment } from '@/types';

type CommentSectionProps = {
  photoId: string;
  photoCreatorId: string;
  initialComments: Comment[];
};

type CommentQueryData = {
  pages: Array<{
    comments: Comment[];
    page: number;
    limit: number;
    totalPages: number;
    total: number;
    hasMore: boolean;
    averageRating: number;
    totalRatings: number;
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
    userHasRated: boolean;
    userRating: number | null;
  }>;
  pageParams: number[];
};

const TEXTAREA_MAX_CHARS = 500;

export default function CommentSection({ photoId, photoCreatorId, initialComments }: CommentSectionProps): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | undefined>();
  const [hoverRating, setHoverRating] = useState<number | undefined>();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const commentsQuery = useInfiniteQuery({
    queryKey: ['photo-comments', photoId],
    queryFn: ({ pageParam }) => fetchComments(photoId, pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialData: {
      pages: [
        {
          comments: initialComments,
          page: 1,
          limit: 20,
          totalPages: initialComments.length >= 20 ? 2 : 1,
          total: initialComments.length,
          hasMore: initialComments.length >= 20,
          averageRating: 0,
          totalRatings: 0,
          distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          userHasRated: false,
          userRating: null,
        },
      ],
      pageParams: [1],
    },
  });

  const comments = useMemo(() => commentsQuery.data?.pages.flatMap((page) => page.comments) ?? [], [commentsQuery.data?.pages]);
  const firstPage = commentsQuery.data?.pages[0];
  const userHasRated = firstPage?.userHasRated ?? false;
  const userRating = firstPage?.userRating ?? null;
  const isConsumer = user?.role === 'consumer';

  const typedCount = draft.length;

  const currentRatingPreview = hoverRating ?? selectedRating;

  const createMutation = useMutation({
    mutationFn: (payload: { text: string; rating?: number }) => createCommentRequest(photoId, payload),
    onMutate: async (payload) => {
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticComment: Comment & { pending?: boolean } = {
        _id: optimisticId,
        text: payload.text,
        rating: payload.rating,
        photo: photoId,
        createdAt: new Date().toISOString(),
        pending: true,
        author: {
          _id: user?._id || 'self',
          username: user?.username || 'you',
          avatar: user?.avatar,
          role: user?.role || 'consumer',
        },
      };

      await queryClient.cancelQueries({ queryKey: ['photo-comments', photoId] });
      const previous = queryClient.getQueryData<CommentQueryData>(['photo-comments', photoId]);

      queryClient.setQueryData<CommentQueryData>(['photo-comments', photoId], (oldData) => {
        if (!oldData) {
          return oldData;
        }

        const first = oldData.pages[0];

        return {
          ...oldData,
          pages: [
            {
              ...first,
              comments: [optimisticComment, ...first.comments],
              total: first.total + 1,
              userHasRated: first.userHasRated || Boolean(payload.rating),
              userRating: payload.rating ?? first.userRating,
            },
            ...oldData.pages.slice(1),
          ],
        };
      });

      setDraft('');
      setSelectedRating(undefined);

      return { previous, optimisticId };
    },
    onSuccess: (createdComment, _payload, context) => {
      queryClient.setQueryData<CommentQueryData>(['photo-comments', photoId], (oldData) => {
        if (!oldData || !context) {
          return oldData;
        }

        const first = oldData.pages[0];

        return {
          ...oldData,
          pages: [
            {
              ...first,
              comments: first.comments.map((comment) => (comment._id === context.optimisticId ? createdComment : comment)),
              userHasRated: first.userHasRated || Boolean(createdComment.rating),
              userRating: createdComment.rating ?? first.userRating,
            },
            ...oldData.pages.slice(1),
          ],
        };
      });

      void queryClient.invalidateQueries({ queryKey: ['photo-comments', photoId] });
      void queryClient.invalidateQueries({ queryKey: ['photo-detail', photoId] });
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['photo-comments', photoId], context.previous);
      }
      toast.error('Could not post comment. Please try again.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCommentRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['photo-comments', photoId] });
      void queryClient.invalidateQueries({ queryKey: ['photo-detail', photoId] });
    },
    onError: () => {
      toast.error('Unable to delete comment right now.');
    },
  });

  const canSubmit = draft.trim().length > 0 && draft.trim().length <= TEXTAREA_MAX_CHARS;

  const submitComment = (): void => {
    const text = draft.trim();

    if (!text) {
      return;
    }

    createMutation.mutate({
      text,
      rating: isConsumer && !userHasRated ? selectedRating : undefined,
    });
  };

  const onDraftChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const next = event.target.value.slice(0, TEXTAREA_MAX_CHARS);
    setDraft(next);

    if (!textareaRef.current) {
      return;
    }

    textareaRef.current.style.height = '0px';
    const maxHeight = 24 * 4;
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submitComment();
  };

  const ratingSummary = {
    averageRating: firstPage?.averageRating ?? 0,
    totalRatings: firstPage?.totalRatings ?? 0,
    distribution: firstPage?.distribution ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
  };

  return (
    <div className="relative space-y-4">
      <RatingSummary {...ratingSummary} />

      <section className="rounded-2xl border border-border/70 bg-black/20 p-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-bg-card">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.username} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs uppercase text-text-secondary">
                {(user?.username || 'MO').slice(0, 2)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={onDraftChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Write your perspective..."
              className="max-h-24 min-h-[42px] w-full resize-none rounded-xl border border-border/80 bg-black/25 px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-gold"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isConsumer && !userHasRated ? (
                  <div title="Rate this photo" className="inline-flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const active = value <= (currentRatingPreview ?? 0);

                      return (
                        <button
                          key={value}
                          type="button"
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(undefined)}
                          onClick={() => setSelectedRating(value === selectedRating ? undefined : value)}
                          className="text-text-muted transition hover:scale-105"
                          aria-label={`Rate ${value} stars`}
                        >
                          <Star size={16} className={active ? 'fill-accent-gold text-accent-gold' : ''} />
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {isConsumer && userHasRated ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-card px-3 py-1 text-xs text-text-secondary">
                    <span>You rated this {userRating ?? 0}/5</span>
                    <span className="inline-flex items-center gap-1">
                      {Array.from({ length: userRating ?? 0 }).map((_, index) => (
                        <Star key={index} size={12} className="fill-accent-gold text-accent-gold" />
                      ))}
                    </span>
                  </div>
                ) : null}

                {typedCount > 400 ? (
                  <span className={`text-xs ${typedCount >= 490 ? 'text-red-400' : 'text-text-muted'}`}>
                    {typedCount}/{TEXTAREA_MAX_CHARS}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {draft.trim().length > 0 ? (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      type="button"
                      onClick={() => {
                        setDraft('');
                        setSelectedRating(undefined);
                      }}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary"
                    >
                      Cancel
                    </motion.button>
                  ) : null}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={submitComment}
                  disabled={!canSubmit || createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-full bg-accent-gold px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <AnimatePresence initial={false}>
          {comments.map((comment) => {
            const canDelete = Boolean(user) && (comment.author._id === user?._id || photoCreatorId === user?._id || user?.role === 'admin');

            return (
              <CommentItem
                key={comment._id}
                comment={comment as Comment & { pending?: boolean }}
                canDelete={canDelete}
                onDelete={async (commentId) => {
                  await deleteMutation.mutateAsync(commentId);
                }}
              />
            );
          })}
        </AnimatePresence>

        {commentsQuery.hasNextPage ? (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => void commentsQuery.fetchNextPage()}
              disabled={commentsQuery.isFetchingNextPage}
              className="rounded-full border border-border bg-bg-card px-5 py-2 text-xs uppercase tracking-[0.16em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold disabled:opacity-60"
            >
              {commentsQuery.isFetchingNextPage ? 'Loading more comments...' : 'Load more comments'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

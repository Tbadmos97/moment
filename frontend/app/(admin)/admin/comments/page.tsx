'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { deleteAdminComment, fetchAdminComments } from '@/lib/admin-api';

export default function AdminCommentsPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const commentsQuery = useQuery({
    queryKey: ['admin-comments', search],
    queryFn: () => fetchAdminComments({ search: search.trim() || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteAdminComment(commentId),
    onSuccess: () => {
      toast.success('Comment removed');
      void queryClient.invalidateQueries({ queryKey: ['admin-comments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: () => toast.error('Unable to remove comment'),
  });

  return (
    <section>
      <h1 className="font-display text-4xl">Comment Moderation</h1>
      <p className="mt-2 text-sm text-text-secondary">Search and remove problematic comments quickly.</p>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search comment text"
        className="mt-5 w-full rounded-xl border border-border bg-bg-card px-3 py-2 text-sm"
      />

      <div className="mt-5 space-y-3">
        {(commentsQuery.data?.comments ?? []).map((comment) => (
          <article key={comment._id} className="rounded-2xl border border-border bg-bg-card/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.12em] text-text-muted">@{comment.author.username} on {comment.photo.title}</p>
              <button
                type="button"
                onClick={() => {
                  void deleteMutation.mutateAsync(comment._id);
                }}
                className="rounded-lg border border-error/60 bg-error/10 px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-error"
              >
                Delete
              </button>
            </div>
            <p className="mt-2 text-sm text-text-primary">{comment.text}</p>
            {typeof comment.rating === 'number' ? (
              <p className="mt-2 text-xs text-text-secondary">Rating: {comment.rating}/5</p>
            ) : null}
          </article>
        ))}
      </div>

      {commentsQuery.isPending ? <p className="mt-4 text-sm text-text-secondary">Loading comments...</p> : null}
    </section>
  );
}

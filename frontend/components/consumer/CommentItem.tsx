'use client';

import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { Comment } from '@/types';

type CommentItemProps = {
  comment: Comment & { pending?: boolean };
  canDelete: boolean;
  onDelete: (commentId: string) => Promise<void>;
};

function DeleteDialog({
  open,
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}): JSX.Element {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg-secondary p-5"
          >
            <p className="font-display text-2xl text-text-primary">Delete comment?</p>
            <p className="mt-2 text-sm text-text-secondary">This action cannot be undone.</p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-sm text-text-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="rounded-full bg-red-500 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export default function CommentItem({ comment, canDelete, onDelete }: CommentItemProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isLong = comment.text.length > 190;
  const text = isLong && !expanded ? `${comment.text.slice(0, 190)}...` : comment.text;

  return (
    <>
      <motion.article
        layout
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: comment.pending ? 0.65 : 1, x: 0 }}
        exit={{ opacity: 0, x: 12 }}
        className="group rounded-xl border border-border/80 bg-black/25 p-3"
      >
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
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold text-accent-gold">@{comment.author.username}</p>
                <p className="text-xs text-text-muted">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</p>
              </div>

              {canDelete ? (
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="opacity-0 transition group-hover:opacity-100 text-text-muted hover:text-red-400"
                  aria-label="Delete comment"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>

            <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{text}</p>
            {isLong ? (
              <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-1 text-xs text-accent-gold">
                {expanded ? 'Show less' : 'Show more'}
              </button>
            ) : null}

            {comment.rating ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-accent-gold">
                {Array.from({ length: comment.rating }).map((_, index) => (
                  <Star key={`${comment._id}-${index}`} size={12} className="fill-accent-gold text-accent-gold" />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </motion.article>

      <DeleteDialog
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await onDelete(comment._id);
            setDialogOpen(false);
          } finally {
            setDeleting(false);
          }
        }}
      />
    </>
  );
}

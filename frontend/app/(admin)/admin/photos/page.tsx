'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { deleteAdminPhoto, fetchAdminPhotos, updateAdminPhotoPublishState } from '@/lib/admin-api';

const statusFilters: Array<'all' | 'published' | 'draft'> = ['all', 'published', 'draft'];

export default function AdminPhotosPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [search, setSearch] = useState('');

  const photosQuery = useQuery({
    queryKey: ['admin-photos', status, search],
    queryFn: () => fetchAdminPhotos({ status, search: search.trim() || undefined }),
  });

  const publishMutation = useMutation({
    mutationFn: ({ photoId, isPublished }: { photoId: string; isPublished: boolean }) =>
      updateAdminPhotoPublishState(photoId, isPublished),
    onSuccess: () => {
      toast.success('Photo status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-photos'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: () => toast.error('Unable to update photo status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (photoId: string) => deleteAdminPhoto(photoId),
    onSuccess: () => {
      toast.success('Photo deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin-photos'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: () => toast.error('Unable to delete photo'),
  });

  return (
    <section>
      <h1 className="font-display text-4xl">Photo Moderation</h1>
      <p className="mt-2 text-sm text-text-secondary">Review publication status and remove harmful content.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr]">
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as 'all' | 'published' | 'draft')}
          className="rounded-xl border border-border bg-bg-card px-3 py-2 text-sm"
        >
          {statusFilters.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title, caption, or tags"
          className="rounded-xl border border-border bg-bg-card px-3 py-2 text-sm"
        />
      </div>

      <div className="mt-5 space-y-3">
        {(photosQuery.data?.photos ?? []).map((photo) => (
          <article key={photo._id} className="grid gap-3 rounded-2xl border border-border bg-bg-card/60 p-3 sm:grid-cols-[88px_1fr_auto] sm:items-center">
            <img src={photo.thumbnailUrl} alt={photo.title} className="h-20 w-20 rounded-lg object-cover" />
            <div>
              <p className="font-medium text-text-primary">{photo.title}</p>
              <p className="mt-1 text-xs text-text-secondary">by @{photo.creator.username}</p>
              <p className="mt-1 text-xs text-text-muted">Likes {photo.likesCount} • Comments {photo.commentsCount}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void publishMutation.mutateAsync({ photoId: photo._id, isPublished: !photo.isPublished });
                }}
                className="rounded-lg border border-border bg-bg-hover px-3 py-2 text-xs uppercase tracking-[0.12em] text-text-secondary hover:border-accent-gold hover:text-accent-gold"
              >
                {photo.isPublished ? 'Unpublish' : 'Publish'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void deleteMutation.mutateAsync(photo._id);
                }}
                className="rounded-lg border border-error/60 bg-error/10 px-3 py-2 text-xs uppercase tracking-[0.12em] text-error"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {photosQuery.isPending ? <p className="mt-4 text-sm text-text-secondary">Loading photos...</p> : null}
    </section>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import PhotoDetailClient from '@/components/consumer/PhotoDetailClient';
import type { Photo } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

export const revalidate = 60;

type PhotoResponse = {
  success: boolean;
  data?: {
    photo?: Photo;
  };
};

type TopViewedResponse = {
  success: boolean;
  data?: {
    photos?: Array<{ _id: string }>;
  };
};

async function fetchPhoto(photoId: string): Promise<Photo | null> {
  const response = await fetch(`${API_BASE_URL}/photos/${photoId}`, {
    method: 'GET',
    cache: 'force-cache',
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as PhotoResponse;
  return payload.data?.photo ?? null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const photo = await fetchPhoto(params.id);

  if (!photo) {
    return {
      title: 'Moment Not Found | MOMENT',
      description: 'This moment is unavailable right now.',
    };
  }

  const description = photo.caption || `Captured by @${photo.creator.username}`;

  return {
    title: `${photo.title} | MOMENT`,
    description,
    openGraph: {
      title: photo.title,
      description,
      images: [
        {
          url: photo.imageUrl,
          alt: photo.title,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: photo.title,
      description,
      images: [photo.imageUrl],
    },
  };
}

export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  const response = await fetch(`${API_BASE_URL}/photos/top-viewed?limit=50`, {
    method: 'GET',
    cache: 'force-cache',
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as TopViewedResponse;
  const photos = payload.data?.photos ?? [];

  return photos.map((photo) => ({ id: photo._id }));
}

export default async function PhotoDetailPage({ params }: { params: { id: string } }): Promise<JSX.Element> {
  const photo = await fetchPhoto(params.id);

  if (!photo) {
    notFound();
  }

  return <PhotoDetailClient photoId={params.id} initialPhoto={photo} />;
}

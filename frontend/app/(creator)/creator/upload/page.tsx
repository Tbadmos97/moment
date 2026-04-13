'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { ImageUp, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import DropZone from '@/components/creator/DropZone';
import TagInput from '@/components/creator/TagInput';
import UploadProgress from '@/components/creator/UploadProgress';
import api from '@/lib/axios';

const uploadSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title max length is 100'),
  caption: z.string().max(500, 'Caption max length is 500').optional().default(''),
  locationName: z.string().max(120, 'Location max length is 120').optional().default(''),
  isPublished: z.boolean().default(true),
});

type UploadFormValues = z.infer<typeof uploadSchema>;
type UploadStage = 'idle' | 'processing' | 'uploading' | 'saving' | 'published';

export default function CreatorUploadPage(): JSX.Element {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ width: number; height: number; fileSize: number } | null>(null);
  const [people, setPeople] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [dropError, setDropError] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      caption: '',
      locationName: '',
      isPublished: true,
    },
  });

  const caption = watch('caption') ?? '';

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setMetadata(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    const image = new Image();
    image.onload = () => {
      setMetadata({
        width: image.width,
        height: image.height,
        fileSize: selectedFile.size,
      });
    };
    image.src = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const isUploading = uploadStage !== 'idle' && uploadStage !== 'published' ? true : isSubmitting;

  const buttonLabel = useMemo(() => {
    if (isUploading) {
      return 'Uploading...';
    }

    return 'Publish Moment';
  }, [isUploading]);

  const onSubmit = async (values: UploadFormValues): Promise<void> => {
    if (!selectedFile) {
      setDropError('Please select an image before uploading.');
      return;
    }

    setDropError(null);
    setUploadStage('processing');
    setUploadProgress(12);

    await new Promise((resolve) => {
      setTimeout(resolve, 380);
    });

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('title', values.title);
    formData.append('caption', values.caption ?? '');
    formData.append('locationName', values.locationName ?? '');
    formData.append('people', JSON.stringify(people));
    formData.append('tags', JSON.stringify(tags));
    formData.append('isPublished', String(values.isPublished));

    try {
      setUploadStage('uploading');

      await api.post('/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event) => {
          const total = event.total ?? selectedFile.size;
          const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
          setUploadProgress(progress);
        },
      });

      setUploadStage('saving');
      await new Promise((resolve) => {
        setTimeout(resolve, 420);
      });

      setUploadStage('published');
      setUploadProgress(100);
      toast.success('Moment published successfully');

      setTimeout(() => {
        router.push('/creator/my-photos');
      }, 1100);
    } catch (error) {
      setUploadStage('idle');
      setUploadProgress(0);

      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined) ?? 'Upload failed. Please try again.'
          : 'Upload failed. Please try again.';

      toast.error(message);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto grid max-w-[1400px] gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <section className="rounded-3xl border border-border bg-bg-secondary/60 p-4 md:p-6">
          <DropZone
            previewUrl={previewUrl}
            metadata={metadata}
            onFileSelect={(file) => {
              setSelectedFile(file);
              setDropError(null);
            }}
            onError={setDropError}
            isUploading={isUploading}
          />

          {dropError ? <p className="mt-3 text-sm text-error">{dropError}</p> : null}
        </section>

        <section className="rounded-3xl border border-border bg-bg-secondary/70 p-6 md:p-7">
          <p className="mb-1 text-xs uppercase tracking-[0.22em] text-accent-gold">Creator Upload</p>
          <h1 className="text-3xl font-display">Craft Your Next Moment</h1>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-1 block text-sm text-text-secondary" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                className="w-full rounded-2xl border border-border bg-bg-card px-4 py-3 font-display text-lg outline-none transition focus:border-accent-gold"
                placeholder="Golden hour in Paris"
                {...register('title')}
              />
              {errors.title ? <p className="mt-1 text-xs text-error">{errors.title.message}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm text-text-secondary" htmlFor="caption">
                Caption
              </label>
              <textarea
                id="caption"
                rows={4}
                className="w-full resize-none rounded-2xl border border-border bg-bg-card px-4 py-3 text-sm outline-none transition focus:border-accent-gold"
                placeholder="Tell the story behind this frame..."
                {...register('caption')}
              />
              <div className="mt-1 flex justify-between text-xs text-text-muted">
                <span>{errors.caption?.message}</span>
                <span>{caption.length}/500</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-text-secondary" htmlFor="locationName">
                Location
              </label>
              <div className="relative">
                <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  id="locationName"
                  className="w-full rounded-2xl border border-border bg-bg-card py-3 pl-9 pr-4 text-sm outline-none transition focus:border-accent-gold"
                  placeholder="Lahore, Pakistan"
                  {...register('locationName')}
                />
              </div>
              {errors.locationName ? <p className="mt-1 text-xs text-error">{errors.locationName.message}</p> : null}
            </div>

            <TagInput
              label="People"
              placeholder="Type a name and press Enter"
              values={people}
              onChange={setPeople}
            />

            <TagInput
              label="Tags"
              placeholder="Type a tag and press Enter"
              values={tags}
              onChange={setTags}
              lowerCase
            />

            <label className="flex items-center justify-between rounded-2xl border border-border bg-bg-card px-4 py-3 text-sm">
              <span>
                {watch('isPublished') ? 'Publish immediately' : 'Save as draft'}
              </span>
              <input type="checkbox" className="h-5 w-5 accent-accent-gold" {...register('isPublished')} />
            </label>

            {uploadStage !== 'idle' ? (
              <UploadProgress stage={uploadStage as Exclude<UploadStage, 'idle'>} progress={uploadProgress} />
            ) : null}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-gold px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-gold-light disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isUploading}
            >
              <ImageUp size={16} />
              {buttonLabel}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { CheckCircle2, Circle, Copy, ExternalLink, ImageUp, MapPin, RefreshCcw, RotateCcw, Sparkles } from 'lucide-react';
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
  caption: z.string().max(500, 'Caption max length is 500'),
  locationName: z.string().max(120, 'Location max length is 120'),
  isPublished: z.boolean(),
});

type UploadFormValues = z.infer<typeof uploadSchema>;
type UploadStage = 'idle' | 'processing' | 'uploading' | 'saving' | 'published';
type AITag = { tag: string; confidence: number };

const CREATOR_UPLOAD_DRAFT_KEY = 'moment:creator-upload-draft:v1';

type UploadDraft = {
  title: string;
  caption: string;
  locationName: string;
  isPublished: boolean;
  people: string[];
  tags: string[];
};

type UploadQueueStatus = 'queued' | 'uploading' | 'failed' | 'done';

type UploadQueueItem = {
  id: string;
  file: File;
  values: UploadFormValues;
  people: string[];
  tags: string[];
  metadata: { width: number; height: number; fileSize: number; mediaKind: 'image' | 'video' } | null;
  status: UploadQueueStatus;
  progress: number;
  error?: string;
};

export default function CreatorUploadPage(): JSX.Element {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{ width: number; height: number; fileSize: number; mediaKind: 'image' | 'video' } | null>(null);
  const [people, setPeople] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [dropError, setDropError] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiSuggestedTags, setAiSuggestedTags] = useState<AITag[]>([]);
  const [isAnalyzingTags, setIsAnalyzingTags] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [lastPublished, setLastPublished] = useState<{ id: string; title: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
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
  const title = watch('title') ?? '';
  const locationName = watch('locationName') ?? '';
  const isPublished = watch('isPublished');

  const metadataAssistantSuggestions = useMemo(() => {
    const source = `${title} ${caption}`.toLowerCase();

    const smartTagRules: Array<{ keyword: RegExp; tag: string }> = [
      { keyword: /(night|neon|city)/, tag: 'nightscape' },
      { keyword: /(sunset|golden|sunrise)/, tag: 'goldenhour' },
      { keyword: /(travel|journey|trip|explore)/, tag: 'travel' },
      { keyword: /(portrait|face|model)/, tag: 'portrait' },
      { keyword: /(food|coffee|dinner|breakfast)/, tag: 'foodstory' },
      { keyword: /(beach|ocean|sea|coast)/, tag: 'seaside' },
    ];

    const smartLocationRules: Array<{ keyword: RegExp; location: string }> = [
      { keyword: /(london|thames|camden)/, location: 'London, UK' },
      { keyword: /(paris|eiffel|louvre)/, location: 'Paris, France' },
      { keyword: /(new york|nyc|manhattan)/, location: 'New York, USA' },
      { keyword: /(dubai|marina|burj)/, location: 'Dubai, UAE' },
      { keyword: /(tokyo|shibuya|shinjuku)/, location: 'Tokyo, Japan' },
      { keyword: /(istanbul|bosphorus)/, location: 'Istanbul, Turkey' },
    ];

    const suggestedTags = smartTagRules
      .filter((rule) => rule.keyword.test(source))
      .map((rule) => rule.tag)
      .filter((tagItem) => !tags.includes(tagItem))
      .slice(0, 4);

    const suggestedLocations = smartLocationRules
      .filter((rule) => rule.keyword.test(source))
      .map((rule) => rule.location)
      .filter((value, index, values) => values.indexOf(value) === index)
      .slice(0, 3);

    return {
      suggestedTags,
      suggestedLocations,
    };
  }, [caption, tags, title]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const raw = window.localStorage.getItem(CREATOR_UPLOAD_DRAFT_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<UploadDraft>;

      reset({
        title: parsed.title ?? '',
        caption: parsed.caption ?? '',
        locationName: parsed.locationName ?? '',
        isPublished: typeof parsed.isPublished === 'boolean' ? parsed.isPublished : true,
      });

      setPeople(Array.isArray(parsed.people) ? parsed.people.slice(0, 10) : []);
      setTags(Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : []);
      setDraftRestored(true);
    } catch {
      window.localStorage.removeItem(CREATOR_UPLOAD_DRAFT_KEY);
    }
  }, [reset]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const hasContent = Boolean(title.trim() || caption.trim() || locationName.trim() || people.length > 0 || tags.length > 0);

    if (!hasContent) {
      window.localStorage.removeItem(CREATOR_UPLOAD_DRAFT_KEY);
      return;
    }

    const timer = window.setTimeout(() => {
      const payload: UploadDraft = {
        title,
        caption,
        locationName,
        isPublished,
        people,
        tags,
      };
      window.localStorage.setItem(CREATOR_UPLOAD_DRAFT_KEY, JSON.stringify(payload));
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [caption, isPublished, locationName, people, tags, title]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setMetadata(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    if (selectedFile.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        setMetadata({
          width: Math.round(video.videoWidth || 1280),
          height: Math.round(video.videoHeight || 720),
          fileSize: selectedFile.size,
          mediaKind: 'video',
        });
      };
      video.src = objectUrl;
    } else {
      const image = new Image();
      image.onload = () => {
        setMetadata({
          width: image.width,
          height: image.height,
          fileSize: selectedFile.size,
          mediaKind: 'image',
        });
      };
      image.src = objectUrl;
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) {
      setAiSuggestedTags([]);
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      setAiSuggestedTags([]);
      setIsAnalyzingTags(false);
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);

    let cancelled = false;
    setIsAnalyzingTags(true);

    void api
      .post('/photos/analyze-tags', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((response) => {
        if (cancelled) {
          return;
        }

        const detected = (response.data?.data?.tags as AITag[] | undefined) ?? [];
        setAiSuggestedTags(detected.slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) {
          setAiSuggestedTags([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsAnalyzingTags(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  const isUploading = Boolean(activeQueueId) || isSubmitting;

  const buttonLabel = useMemo(() => {
    if (isUploading) {
      return 'Queue processing...';
    }

    return 'Add To Queue';
  }, [isUploading]);

  const processQueueItem = async (item: UploadQueueItem): Promise<void> => {
    setActiveQueueId(item.id);
    setUploadStage('processing');
    setUploadProgress(10);

    setUploadQueue((current) =>
      current.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status: 'uploading',
              progress: 10,
              error: undefined,
            }
          : entry,
      ),
    );

    const formData = new FormData();
    formData.append('image', item.file);
    formData.append('title', item.values.title);
    formData.append('caption', item.values.caption ?? '');
    formData.append('locationName', item.values.locationName ?? '');
    formData.append('people', JSON.stringify(item.people));
    formData.append('tags', JSON.stringify(item.tags));
    formData.append('isPublished', String(item.values.isPublished));

    if (item.metadata) {
      formData.append('width', String(item.metadata.width));
      formData.append('height', String(item.metadata.height));
    }

    try {
      setUploadStage('uploading');

      const response = await api.post('/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event) => {
          const total = event.total ?? item.file.size;
          const progress = total > 0 ? Math.round((event.loaded / total) * 100) : 0;
          setUploadProgress(progress);
          setUploadQueue((current) =>
            current.map((entry) => (entry.id === item.id ? { ...entry, progress } : entry)),
          );
        },
      });

      setUploadStage('saving');
      setUploadQueue((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: 'done',
                progress: 100,
              }
            : entry,
        ),
      );

      const photoId = response.data?.data?.photo?._id as string | undefined;
      const photoTitle = response.data?.data?.photo?.title as string | undefined;
      if (photoId && photoTitle) {
        setLastPublished({ id: photoId, title: photoTitle });
      }

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(CREATOR_UPLOAD_DRAFT_KEY);
      }

      setUploadStage('published');
      setUploadProgress(100);
      toast.success(`Uploaded: ${item.values.title}`);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined) ?? 'Upload failed. Please try again.'
          : 'Upload failed. Please try again.';

      setUploadQueue((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: 'failed',
                error: message,
              }
            : entry,
        ),
      );

      setUploadStage('idle');
      setUploadProgress(0);
      toast.error(message);
    } finally {
      setActiveQueueId(null);
    }
  };

  useEffect(() => {
    if (activeQueueId) {
      return;
    }

    const next = uploadQueue.find((item) => item.status === 'queued');
    if (!next) {
      return;
    }

    void processQueueItem(next);
  }, [activeQueueId, uploadQueue]);

  const onSubmit = async (values: UploadFormValues): Promise<void> => {
    if (!selectedFile) {
      setDropError('Please select an image before uploading.');
      return;
    }

    setDropError(null);

    const queueItem: UploadQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file: selectedFile,
      values,
      people: [...people],
      tags: [...tags],
      metadata,
      status: 'queued',
      progress: 0,
    };

    setUploadQueue((current) => [...current, queueItem]);
    toast.success(`Added to queue: ${values.title}`);

    setSelectedFile(null);
    setPreviewUrl(null);
    setMetadata(null);
    reset({
      title: '',
      caption: '',
      locationName: values.locationName,
      isPublished: values.isPublished,
    });
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
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.22em] text-accent-gold">Creator Upload</p>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem(CREATOR_UPLOAD_DRAFT_KEY);
                }
                reset({ title: '', caption: '', locationName: '', isPublished: true });
                setPeople([]);
                setTags([]);
                setDraftRestored(false);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
            >
              <RotateCcw size={12} />
              Clear draft
            </button>
          </div>
          <h1 className="text-3xl font-display">Craft Your Next Moment</h1>
          {draftRestored ? <p className="mt-2 text-xs text-accent-gold">Draft restored from previous session.</p> : null}

          <div className="mt-5 rounded-2xl border border-border bg-bg-card/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">Publish readiness</p>
            <div className="mt-2 grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
              {[
                { label: 'Media selected', done: Boolean(selectedFile) },
                { label: 'Title added', done: title.trim().length > 0 },
                { label: 'Location set', done: locationName.trim().length > 0 },
                { label: 'At least one tag', done: tags.length > 0 },
              ].map((item) => (
                <p key={item.label} className="inline-flex items-center gap-2">
                  {item.done ? <CheckCircle2 size={14} className="text-success" /> : <Circle size={14} className="text-text-muted" />}
                  {item.label}
                </p>
              ))}
            </div>
          </div>

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
                  placeholder="London, UK"
                  {...register('locationName')}
                />
              </div>
              {metadataAssistantSuggestions.suggestedLocations.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {metadataAssistantSuggestions.suggestedLocations.map((location) => (
                    <button
                      key={location}
                      type="button"
                      onClick={() => reset({ title, caption, locationName: location, isPublished })}
                      className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
                    >
                      {location}
                    </button>
                  ))}
                </div>
              ) : null}
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

            {metadataAssistantSuggestions.suggestedTags.length > 0 ? (
              <div className="rounded-2xl border border-border bg-bg-card px-4 py-3">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-accent-gold">
                  <Sparkles size={14} />
                  Smart tag suggestions
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {metadataAssistantSuggestions.suggestedTags.map((tagItem) => (
                    <button
                      key={tagItem}
                      type="button"
                      onClick={() => {
                        setTags((current) => {
                          const next = Array.from(new Set([...current, tagItem]));
                          return next.slice(0, 10);
                        });
                      }}
                      className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
                    >
                      #{tagItem}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isAnalyzingTags || aiSuggestedTags.length > 0 ? (
              <div className="rounded-2xl border border-border bg-bg-card px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-accent-gold">AI-detected tags</p>
                {isAnalyzingTags ? <p className="mt-2 text-xs text-text-secondary">Analyzing image...</p> : null}

                {!isAnalyzingTags && aiSuggestedTags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {aiSuggestedTags.map((item) => (
                      <button
                        key={`${item.tag}-${item.confidence}`}
                        type="button"
                        onClick={() => {
                          setTags((current) => {
                            const next = Array.from(new Set([...current, item.tag.toLowerCase()]));
                            return next.slice(0, 10);
                          });
                        }}
                        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
                        title={`Confidence ${(item.confidence * 100).toFixed(0)}%`}
                      >
                        {item.tag}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

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

        <section className="rounded-3xl border border-border bg-bg-secondary/70 p-6 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.18em] text-accent-gold">Upload Queue</p>
            <p className="text-xs text-text-muted">{uploadQueue.filter((item) => item.status === 'queued' || item.status === 'uploading').length} pending</p>
          </div>

          {uploadQueue.length === 0 ? <p className="mt-3 text-sm text-text-secondary">No queued uploads yet.</p> : null}

          {uploadQueue.length > 0 ? (
            <div className="mt-4 space-y-3">
              {uploadQueue.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-bg-card/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary">{item.values.title}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-text-muted">{item.status}</p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30">
                    <div className="h-full rounded-full bg-accent-gold transition-all" style={{ width: `${item.progress}%` }} />
                  </div>

                  {item.error ? <p className="mt-2 text-xs text-error">{item.error}</p> : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.status === 'failed' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadQueue((current) =>
                            current.map((entry) =>
                              entry.id === item.id
                                ? { ...entry, status: 'queued', progress: 0, error: undefined }
                                : entry,
                            ),
                          );
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
                      >
                        <RefreshCcw size={12} />
                        Retry
                      </button>
                    ) : null}

                    {(item.status === 'done' || item.status === 'failed') ? (
                      <button
                        type="button"
                        onClick={() => {
                          setUploadQueue((current) => current.filter((entry) => entry.id !== item.id));
                        }}
                        className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {lastPublished ? (
            <div className="mt-6 rounded-2xl border border-border bg-bg-card px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-accent-gold">Latest publish</p>
              <p className="mt-2 text-sm font-medium text-text-primary">{lastPublished.title}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push('/creator/my-photos')}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
                >
                  <ExternalLink size={12} />
                  My photos
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (typeof window === 'undefined') {
                      return;
                    }
                    const link = `${window.location.origin}/photos/${lastPublished.id}`;
                    try {
                      await navigator.clipboard.writeText(link);
                      toast.success('Share link copied');
                    } catch {
                      toast.error('Unable to copy link');
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-text-secondary transition hover:border-accent-gold hover:text-accent-gold"
                >
                  <Copy size={12} />
                  Copy link
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

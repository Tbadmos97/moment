import type { AxiosProgressEvent } from 'axios';

import api from '@/lib/axios';

type UploadPayload = {
  file: File;
  fields: Record<string, string>;
};

type UploadOptions = {
  maxRetries?: number;
  onProgress?: (progress: number) => void;
};

type ResumableSessionResponse = {
  success: boolean;
  data?: {
    sessionId?: string;
    chunkSize?: number;
  };
};

const clampProgress = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
};

const buildFormData = (payload: UploadPayload): FormData => {
  const formData = new FormData();
  formData.append('image', payload.file);

  Object.entries(payload.fields).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return formData;
};

const uploadWithClassicFlow = async (payload: UploadPayload, options: UploadOptions): Promise<unknown> => {
  const maxRetries = options.maxRetries ?? 2;

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await api.post('/photos', buildFormData(payload), {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (event: AxiosProgressEvent) => {
          const total = event.total ?? payload.file.size;
          const progress = total > 0 ? (event.loaded / total) * 100 : 0;
          options.onProgress?.(clampProgress(progress));
        },
      });
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }

      attempt += 1;
    }
  }

  throw new Error('Upload failed after retries');
};

/**
 * Resumable-ready uploader.
 * It first attempts optional resumable endpoints and gracefully falls back to classic upload.
 */
export const uploadWithResumeStrategy = async (
  payload: UploadPayload,
  options: UploadOptions = {},
): Promise<unknown> => {
  const maxRetries = options.maxRetries ?? 2;

  try {
    const session = await api.post<ResumableSessionResponse>('/uploads/resumable/sessions', {
      fileName: payload.file.name,
      mimeType: payload.file.type,
      fileSize: payload.file.size,
    });

    const sessionId = session.data?.data?.sessionId;
    const chunkSize = session.data?.data?.chunkSize ?? 5 * 1024 * 1024;

    if (!sessionId) {
      throw new Error('Invalid resumable session');
    }

    const totalChunks = Math.max(1, Math.ceil(payload.file.size / chunkSize));

    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, payload.file.size);
      const chunk = payload.file.slice(start, end);

      await api.put(`/uploads/resumable/sessions/${sessionId}/chunks/${index}`, chunk, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      options.onProgress?.(clampProgress(((index + 1) / totalChunks) * 90));
    }

    const completion = await api.post(`/uploads/resumable/sessions/${sessionId}/complete`, payload.fields);
    options.onProgress?.(100);
    return completion;
  } catch {
    // Resumable endpoints are optional. Fallback keeps current backend-compatible behavior.
    return uploadWithClassicFlow(payload, { maxRetries, onProgress: options.onProgress });
  }
};

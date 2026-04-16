'use client';

import { Camera } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import ImagePreview from './ImagePreview';

interface DropZoneProps {
  previewUrl: string | null;
  metadata: { width: number; height: number; fileSize: number; mediaKind: 'image' | 'video' } | null;
  onFileSelect: (file: File) => void;
  onError: (message: string | null) => void;
  isUploading: boolean;
}

export default function DropZone({
  previewUrl,
  metadata,
  onFileSelect,
  onError,
  isUploading,
}: DropZoneProps): JSX.Element {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov'],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    noClick: Boolean(previewUrl),
    noKeyboard: true,
    disabled: isUploading,
    onDropAccepted: (files) => {
      onError(null);
      const [file] = files;
      if (file) {
        onFileSelect(file);
      }
    },
    onDropRejected: (rejections) => {
      const first = rejections[0];
      const firstErrorCode = first?.errors?.[0]?.code;

      if (firstErrorCode === 'file-too-large') {
        onError('File too large. Maximum size is 50MB.');
        return;
      }

      if (firstErrorCode === 'file-invalid-type') {
        onError('Unsupported format. Please use JPG, PNG, WEBP, MP4, WEBM, or MOV.');
        return;
      }

      onError('Unable to use this file. Try another image.');
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`upload-dash-border relative flex h-full min-h-[420px] cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed bg-bg-card p-8 text-center transition ${
        isDragActive ? 'border-accent-gold bg-accent-gold/5 shadow-[0_0_40px_rgba(201,168,76,0.18)]' : 'border-border'
      } ${isUploading ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <input {...getInputProps()} />

      {previewUrl && metadata ? (
        <ImagePreview
          previewUrl={previewUrl}
          width={metadata.width}
          height={metadata.height}
          fileSize={metadata.fileSize}
          mediaKind={metadata.mediaKind}
          onChangePhoto={open}
        />
      ) : (
        <div className="space-y-4">
          <Camera className="mx-auto h-11 w-11 animate-pulse text-accent-gold" />
          <h2 className="text-3xl font-display text-text-primary">Drop your moment here</h2>
          <p className="text-sm text-text-secondary">Click to browse or drag and drop JPG, PNG, WEBP, MP4, WEBM, or MOV up to 50MB</p>
        </div>
      )}
    </div>
  );
}

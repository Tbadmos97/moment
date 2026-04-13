'use client';

import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import ImagePreview from './ImagePreview';

interface DropZoneProps {
  previewUrl: string | null;
  metadata: { width: number; height: number; fileSize: number } | null;
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
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
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
        onError('File too large. Maximum size is 10MB.');
        return;
      }

      if (firstErrorCode === 'file-invalid-type') {
        onError('Unsupported format. Please use JPG, PNG, or WEBP.');
        return;
      }

      onError('Unable to use this file. Try another image.');
    },
  });

  return (
    <motion.div
      {...getRootProps()}
      animate={{ scale: isDragActive ? 1.02 : 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
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
          onChangePhoto={open}
        />
      ) : (
        <div className="space-y-4">
          <Camera className="mx-auto h-11 w-11 animate-pulse text-accent-gold" />
          <h2 className="text-3xl font-display text-text-primary">Drop your moment here</h2>
          <p className="text-sm text-text-secondary">Click to browse or drag and drop JPG, PNG, or WEBP up to 10MB</p>
        </div>
      )}
    </motion.div>
  );
}

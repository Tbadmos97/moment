import Image from 'next/image';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface ImagePreviewProps {
  previewUrl: string;
  width: number;
  height: number;
  fileSize: number;
  onChangePhoto: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function ImagePreview({
  previewUrl,
  width,
  height,
  fileSize,
  onChangePhoto,
}: ImagePreviewProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group relative h-full min-h-[360px] w-full overflow-hidden rounded-3xl"
    >
      <Image src={previewUrl} alt="Selected upload preview" fill className="object-cover" unoptimized />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
      <button
        type="button"
        onClick={onChangePhoto}
        className="absolute inset-x-0 top-1/2 mx-auto flex w-fit -translate-y-1/2 items-center gap-2 rounded-full border border-border bg-black/70 px-4 py-2 text-xs text-text-primary opacity-0 transition group-hover:opacity-100"
      >
        <RefreshCw size={14} />
        Change photo
      </button>
      <div className="absolute bottom-4 right-4 rounded-full border border-border bg-black/65 px-3 py-1 text-xs text-text-primary">
        {width}x{height} • {formatFileSize(fileSize)}
      </div>
    </motion.div>
  );
}

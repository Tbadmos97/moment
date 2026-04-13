import { motion } from 'framer-motion';

type UploadStage = 'processing' | 'uploading' | 'saving' | 'published';

interface UploadProgressProps {
  stage: UploadStage;
  progress: number;
}

const stageLabels: Record<UploadStage, string> = {
  processing: 'Processing image...',
  uploading: 'Uploading...',
  saving: 'Saving...',
  published: 'Published! ✓',
};

const getDisplayProgress = (stage: UploadStage, progress: number): number => {
  if (stage === 'processing') {
    return Math.max(12, progress);
  }

  if (stage === 'uploading') {
    return Math.max(28, progress);
  }

  if (stage === 'saving') {
    return 88;
  }

  return 100;
};

export default function UploadProgress({ stage, progress }: UploadProgressProps): JSX.Element {
  const displayProgress = getDisplayProgress(stage, progress);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-text-primary">{stageLabels[stage]}</p>
      <div className="h-2 overflow-hidden rounded-full bg-bg-hover">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-accent-gold-dark via-accent-gold to-accent-gold-light"
          initial={{ width: '0%' }}
          animate={{ width: `${displayProgress}%` }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {stage === 'published' ? (
        <div className="pointer-events-none relative h-8 overflow-hidden" aria-hidden>
          {Array.from({ length: 16 }).map((_, index) => (
            <span
              key={index}
              className="confetti-piece"
              style={{
                left: `${5 + index * 6}%`,
                animationDelay: `${index * 0.04}s`,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

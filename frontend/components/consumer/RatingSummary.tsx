'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

type RatingSummaryProps = {
  averageRating: number;
  totalRatings: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
};

const renderStars = (value: number): Array<'full' | 'half' | 'empty'> => {
  return Array.from({ length: 5 }, (_, index) => {
    const star = index + 1;

    if (value >= star) {
      return 'full';
    }

    if (value >= star - 0.5) {
      return 'half';
    }

    return 'empty';
  });
};

export default function RatingSummary({ averageRating, totalRatings, distribution }: RatingSummaryProps): JSX.Element {
  const stars = renderStars(averageRating);

  return (
    <section className="rounded-2xl border border-border/70 bg-black/20 p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-5xl leading-none text-text-primary">{averageRating.toFixed(1)}</p>
          <div className="mt-2 flex items-center gap-1">
            {stars.map((star, index) => (
              <span key={`${star}-${index}`} className="relative inline-flex">
                <Star size={14} className="text-border" />
                {star === 'full' ? <Star size={14} className="absolute inset-0 fill-accent-gold text-accent-gold" /> : null}
                {star === 'half' ? (
                  <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                    <Star size={14} className="fill-accent-gold text-accent-gold" />
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{totalRatings} ratings</p>
      </div>

      <div className="mt-4 space-y-2">
        {[5, 4, 3, 2, 1].map((value) => {
          const count = distribution[String(value) as '1' | '2' | '3' | '4' | '5'] ?? 0;
          const width = totalRatings > 0 ? (count / totalRatings) * 100 : 0;

          return (
            <div key={value} className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="w-6">{value}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-card">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full bg-accent-gold"
                />
              </div>
              <span className="w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

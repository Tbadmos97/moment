import { Camera, Images, Sparkles } from 'lucide-react';

const features = [
  {
    title: 'Curated Creator Stories',
    description: 'Creator dashboards designed for rich photo narratives with premium metadata and seamless publishing.',
    icon: Camera,
  },
  {
    title: 'Immersive Discovery',
    description: 'Masonry-first browsing experience optimized for visual depth, speed, and editorial composition.',
    icon: Images,
  },
  {
    title: 'Luxury UI Motion',
    description: 'Purposeful transitions and nuanced micro-interactions that keep attention on the story inside each frame.',
    icon: Sparkles,
  },
];

export default function Home(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 pb-12 pt-14 sm:px-10">
      <section className="animate-fadeIn rounded-3xl border border-border bg-bg-secondary/70 p-8 backdrop-blur md:p-12">
        <p className="mb-4 inline-flex rounded-full border border-accent-gold/50 px-3 py-1 text-xs uppercase tracking-[0.22em] text-accent-gold">
          MOMENT
        </p>
        <h1 className="text-balance max-w-3xl text-4xl font-semibold leading-tight text-text-primary md:text-6xl">
          Capture the moment. Share the story.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-text-secondary md:text-base">
          A production-grade photo sharing platform where creators publish visual stories and audiences discover meaningful
          moments through an elegant, performance-first experience.
        </p>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <article
              key={feature.title}
              className="animate-slideUp rounded-2xl border border-border bg-bg-card p-6 transition duration-300 hover:border-accent-gold/60 hover:bg-bg-hover"
            >
              <Icon className="mb-4 h-5 w-5 text-accent-gold" />
              <h2 className="text-xl font-medium text-text-primary">{feature.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{feature.description}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

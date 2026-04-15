'use client';

import { AxiosError } from 'axios';
import { Crown, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';

export default function ConsumerProfilePage(): JSX.Element {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const becomeCreator = useAuthStore((state) => state.becomeCreator);
  const [creatorCode, setCreatorCode] = useState('');

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const normalized = creatorCode.trim();
    if (!normalized) {
      toast.error('Creator access code is required');
      return;
    }

    try {
      await becomeCreator(normalized);
      toast.success('Your account is now creator-enabled');
      router.replace('/creator');
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message as string | undefined) ?? 'Unable to upgrade account right now.'
          : 'Unable to upgrade account right now.';

      toast.error(message);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border/80 bg-black/20 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-accent-gold">Account</p>
        <h1 className="mt-3 font-display text-4xl text-text-primary">Profile & Creator Upgrade</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Logged in as <span className="font-semibold text-text-primary">@{user?.username ?? 'consumer'}</span>. If you have a creator access code, upgrade this same account without re-registering.
        </p>

        <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-bg-card/60 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Email</p>
            <p className="mt-1 text-sm text-text-primary">{user?.email ?? 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Current Role</p>
            <p className="mt-1 text-sm capitalize text-text-primary">{user?.role ?? 'consumer'}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 rounded-2xl border border-border bg-bg-secondary/70 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-accent-gold">
            <Crown size={18} />
            <p className="text-sm font-semibold uppercase tracking-[0.14em]">Become Creator</p>
          </div>

          <label className="mt-4 block text-sm text-text-secondary" htmlFor="creatorAccessCode">
            Creator Access Code
          </label>
          <input
            id="creatorAccessCode"
            type="password"
            value={creatorCode}
            onChange={(event) => setCreatorCode(event.target.value)}
            placeholder="Enter your secure code"
            className="mt-2 w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-sm outline-none transition focus:border-accent-gold"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-gold px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-gold-light disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Upgrading...
              </>
            ) : (
              'Upgrade to Creator'
            )}
          </button>
        </form>
      </section>
    </main>
  );
}

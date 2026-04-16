'use client';

import { AxiosError } from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, LoaderCircle, MonitorX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';

import { fetchActiveSessions, revokeActiveSession } from '@/lib/auth-api';
import { useAuthStore } from '@/store/authStore';

export default function ConsumerProfilePage(): JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const becomeCreator = useAuthStore((state) => state.becomeCreator);
  const [creatorCode, setCreatorCode] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const currentRole = user?.role ?? 'consumer';
  const isCreatorEnabled = currentRole === 'creator' || currentRole === 'admin';

  const roleBadgeClass = isCreatorEnabled
    ? 'border-success/50 bg-success/10 text-success'
    : 'border-accent-gold/50 bg-accent-gold/10 text-accent-gold';

  const roleBadgeLabel = isCreatorEnabled ? 'Creator Enabled' : 'Consumer Account';

  const sessionsQuery = useQuery({
    queryKey: ['active-sessions'],
    queryFn: fetchActiveSessions,
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (tokenId: string) => revokeActiveSession(tokenId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      toast.success('Session revoked');
    },
    onError: () => {
      toast.error('Unable to revoke this session right now');
    },
  });

  const onRequestUpgrade = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const normalized = creatorCode.trim();
    if (!normalized) {
      toast.error('Creator access code is required');
      return;
    }

    if (isCreatorEnabled) {
      toast.success('Your account already has creator access');
      router.replace('/creator');
      return;
    }

    setShowConfirmModal(true);
  };

  const onConfirmUpgrade = async (): Promise<void> => {
    const normalized = creatorCode.trim();
    if (!normalized) {
      toast.error('Creator access code is required');
      return;
    }

    try {
      await becomeCreator(normalized);
      toast.success('Your account is now creator-enabled');
      setShowConfirmModal(false);
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
    <>
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-border/80 bg-black/20 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-accent-gold">Account</p>
        <h1 className="mt-3 font-display text-4xl text-text-primary">Profile & Creator Upgrade</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Logged in as <span className="font-semibold text-text-primary">@{user?.username ?? 'consumer'}</span>. If you have a creator access code, upgrade this same account without re-registering.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-text-secondary">
          <span>Status:</span>
          <span className={`rounded-full border px-2.5 py-1 ${roleBadgeClass}`}>{roleBadgeLabel}</span>
        </div>

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

        <form onSubmit={onRequestUpgrade} className="mt-6 rounded-2xl border border-border bg-bg-secondary/70 p-5 sm:p-6">
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

          <p className="mt-2 text-xs text-text-muted">
            You will keep this account, and your role will be upgraded to creator after confirmation.
          </p>

          <button
            type="submit"
            disabled={isLoading || isCreatorEnabled}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-accent-gold px-5 py-3 text-sm font-semibold text-black transition hover:bg-accent-gold-light disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Upgrading...
              </>
            ) : (
              isCreatorEnabled ? 'Already Creator Enabled' : 'Upgrade to Creator'
            )}
          </button>
        </form>

        <section className="mt-6 rounded-2xl border border-border bg-bg-secondary/70 p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-accent-gold">Active Sessions</p>
          <h2 className="mt-2 font-display text-2xl text-text-primary">Manage your signed-in devices</h2>

          {sessionsQuery.isPending ? <p className="mt-3 text-sm text-text-secondary">Loading active sessions...</p> : null}

          {!sessionsQuery.isPending && (sessionsQuery.data ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">No active sessions found.</p>
          ) : null}

          <div className="mt-4 space-y-3">
            {(sessionsQuery.data ?? []).map((session) => (
              <article key={session.tokenId} className="rounded-xl border border-border bg-bg-card/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{session.maskedToken}</p>
                    <p className="mt-1 text-xs text-text-muted">{session.userAgent ?? 'Unknown browser/device'}</p>
                    <p className="mt-1 text-xs text-text-muted">IP: {session.ipAddress ?? 'N/A'}</p>
                    <p className="mt-1 text-xs text-text-muted">Last used: {new Date(session.lastUsedAt).toLocaleString()}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => revokeSessionMutation.mutate(session.tokenId)}
                    disabled={revokeSessionMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-text-secondary transition hover:border-red-400 hover:text-red-400 disabled:opacity-60"
                  >
                    <MonitorX size={14} />
                    Revoke
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
      </main>

      <AnimatePresence>
        {showConfirmModal ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-black/75"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isLoading) {
                  setShowConfirmModal(false);
                }
              }}
            />

            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-bg-secondary p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-accent-gold">Confirm Upgrade</p>
              <h2 className="mt-2 font-display text-3xl text-text-primary">Become Creator?</h2>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                This will switch your account role from consumer to creator and route you to the creator workspace.
              </p>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isLoading}
                  className="rounded-xl border border-border bg-bg-card px-4 py-2 text-sm text-text-secondary transition hover:text-text-primary disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void onConfirmUpgrade();
                  }}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent-gold-light disabled:opacity-70"
                >
                  {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : null}
                  Confirm Upgrade
                </button>
              </div>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

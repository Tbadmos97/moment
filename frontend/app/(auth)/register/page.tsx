'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import api from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores are allowed'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, 'Use one uppercase, one number, and one special character'),
    confirmPassword: z.string(),
    accountType: z.enum(['consumer', 'creator']),
    creatorAccessCode: z.string().optional(),
  })
  .refine(
    (values) => values.accountType === 'consumer' || (values.creatorAccessCode ?? '').trim().length >= 6,
    {
      message: 'Creator access code is required',
      path: ['creatorAccessCode'],
    },
  )
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

type StrengthLevel = {
  label: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
  color: string;
};

const calculatePasswordStrength = (password: string): StrengthLevel => {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z\d]/.test(password)) score += 1;

  if (score <= 1) return { label: 'weak', score: 1, color: 'bg-error' };
  if (score === 2) return { label: 'fair', score: 2, color: 'bg-orange-400' };
  if (score === 3) return { label: 'good', score: 3, color: 'bg-accent-gold' };
  return { label: 'strong', score: 4, color: 'bg-success' };
};

export default function RegisterPage(): JSX.Element {
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const hasRedirectedRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      accountType: 'consumer',
      creatorAccessCode: '',
    },
  });

  const watchedUsername = watch('username');
  const watchedPassword = watch('password');
  const watchedAccountType = watch('accountType');

  const passwordStrength = useMemo(() => calculatePasswordStrength(watchedPassword || ''), [watchedPassword]);

  useEffect(() => {
    const normalizedUsername = watchedUsername?.trim();

    if (!normalizedUsername || normalizedUsername.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);

    const handle = window.setTimeout(async () => {
      try {
        const response = await api.get('/users/check-username', {
          params: { username: normalizedUsername },
        });

        setUsernameAvailable(Boolean(response.data?.data?.available));
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => {
      window.clearTimeout(handle);
    };
  }, [watchedUsername]);

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    try {
      await registerUser({
        username: values.username,
        email: values.email,
        password: values.password,
        role: values.accountType,
        creatorAccessCode: values.accountType === 'creator' ? values.creatorAccessCode?.trim() : undefined,
      });
      const role = useAuthStore.getState().user?.role;
      toast.success(`Account created (${role === 'creator' || role === 'admin' ? 'creator' : 'consumer'})`);
      hasRedirectedRef.current = true;
      router.replace(role === 'creator' || role === 'admin' ? '/creator' : '/discover');
    } catch {
      toast.error('Registration failed. Please try again.');
    }
  };

  useEffect(() => {
    if (hasRedirectedRef.current || isLoading || !isAuthenticated || !user) {
      return;
    }

    hasRedirectedRef.current = true;
    router.replace(user.role === 'creator' || user.role === 'admin' ? '/creator' : '/discover');
  }, [isAuthenticated, isLoading, router, user]);

  return (
    <motion.div layoutId="auth-content">
      <p className="text-2xl font-display text-text-primary">Create Account</p>
      <p className="mt-2 text-sm text-text-secondary">Join MOMENT and start sharing stories.</p>
      <p className="mt-2 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-text-secondary">
        Choose account type below. Creator registration requires a secure creator access code.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-1 block text-sm text-text-secondary">Account Type</label>
          <div className="grid grid-cols-2 gap-2">
            <label className="cursor-pointer">
              <input type="radio" value="consumer" className="peer sr-only" {...register('accountType')} />
              <span className="flex items-center justify-center rounded-xl border border-border bg-bg-card px-4 py-3 text-sm text-text-secondary transition peer-checked:border-accent-gold peer-checked:text-accent-gold">
                Consumer
              </span>
            </label>
            <label className="cursor-pointer">
              <input type="radio" value="creator" className="peer sr-only" {...register('accountType')} />
              <span className="flex items-center justify-center rounded-xl border border-border bg-bg-card px-4 py-3 text-sm text-text-secondary transition peer-checked:border-accent-gold peer-checked:text-accent-gold">
                Creator
              </span>
            </label>
          </div>
          {errors.accountType ? <p className="mt-1 text-xs text-error">{errors.accountType.message}</p> : null}
        </div>

        {watchedAccountType === 'creator' ? (
          <div>
            <label className="mb-1 block text-sm text-text-secondary" htmlFor="creatorAccessCode">
              Creator Access Code
            </label>
            <input
              id="creatorAccessCode"
              type="password"
              className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-sm outline-none transition focus:border-accent-gold"
              placeholder="Enter secure creator code"
              {...register('creatorAccessCode')}
            />
            {errors.creatorAccessCode ? <p className="mt-1 text-xs text-error">{errors.creatorAccessCode.message}</p> : null}
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-sm text-text-secondary" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-sm outline-none transition focus:border-accent-gold"
            placeholder="your_username"
            {...register('username')}
          />
          {errors.username ? <p className="mt-1 text-xs text-error">{errors.username.message}</p> : null}
          {!errors.username && watchedUsername?.length >= 3 ? (
            <p className="mt-1 text-xs text-text-secondary">
              {checkingUsername
                ? 'Checking username...'
                : usernameAvailable === null
                  ? 'Unable to verify username right now'
                  : usernameAvailable
                    ? 'Username is available'
                    : 'Username is already taken'}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-secondary" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-sm outline-none transition focus:border-accent-gold"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email ? <p className="mt-1 text-xs text-error">{errors.email.message}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-secondary" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-sm outline-none transition focus:border-accent-gold"
            placeholder="••••••••"
            {...register('password')}
          />
          {errors.password ? <p className="mt-1 text-xs text-error">{errors.password.message}</p> : null}

          <div className="mt-2">
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((level) => (
                <motion.div
                  key={level}
                  layout
                  className={`h-1.5 rounded ${level <= passwordStrength.score ? passwordStrength.color : 'bg-bg-hover'}`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs uppercase tracking-[0.15em] text-text-secondary">Strength: {passwordStrength.label}</p>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-text-secondary" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 text-sm outline-none transition focus:border-accent-gold"
            placeholder="Repeat your password"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? <p className="mt-1 text-xs text-error">{errors.confirmPassword.message}</p> : null}
        </div>

        {watchedAccountType === 'creator' ? (
          <p className="rounded-xl border border-border bg-bg-card px-4 py-3 text-xs text-text-secondary">
            Creator accounts need a valid creator access code configured by admin.
          </p>
        ) : null}

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-gold-light disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading || usernameAvailable === false}
        >
          {isLoading ? (
            <>
              <LoaderCircle size={16} className="animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </motion.button>
      </form>

      <p className="mt-5 text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="text-accent-gold hover:text-accent-gold-light">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

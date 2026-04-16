'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [showPassword, setShowPassword] = useState(false);
  const [shakeForm, setShakeForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    try {
      await login({ email: values.email, password: values.password });
      const role = useAuthStore.getState().user?.role;
      toast.success(`Welcome back (${role === 'admin' ? 'admin' : role === 'creator' ? 'creator' : 'consumer'})`);
      router.replace(role === 'admin' ? '/admin' : role === 'creator' ? '/creator' : '/discover');
    } catch {
      setShakeForm(true);
      window.setTimeout(() => setShakeForm(false), 420);
      toast.error('Wrong credentials. Please try again.');
    }
  };

  return (
    <motion.div
      layoutId="auth-content"
      animate={shakeForm ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.36 }}
    >
      <p className="text-2xl font-display text-text-primary">Sign In</p>
      <p className="mt-2 text-sm text-text-secondary">Step into your visual world.</p>
      <p className="mt-2 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-text-secondary">
        Role is detected automatically from your account: creators go to Creator Dashboard, consumers go to Discover.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded-xl border border-border bg-bg-card px-4 py-3 pr-12 text-sm outline-none transition focus:border-accent-gold"
              placeholder="Enter your password"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
              onClick={() => setShowPassword((value) => !value)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password ? <p className="mt-1 text-xs text-error">{errors.password.message}</p> : null}
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary" htmlFor="rememberMe">
          <input id="rememberMe" type="checkbox" className="h-4 w-4 rounded border-border accent-accent-gold" {...register('rememberMe')} />
          Remember me
        </label>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-gold px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-gold-light disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <LoaderCircle size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </motion.button>
      </form>

      <p className="mt-5 text-sm text-text-secondary">
        New here?{' '}
        <Link href="/register" className="text-accent-gold hover:text-accent-gold-light">
          Create an account
        </Link>
      </p>
    </motion.div>
  );
}

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import AuthBootstrap from '@/components/auth/AuthBootstrap';

type ProvidersProps = {
  children: ReactNode;
};

/**
 * Wraps the app with shared client-side providers.
 */
export default function Providers({ children }: ProvidersProps): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A1A',
            color: '#FAFAFA',
            border: '1px solid #2A2A2A',
          },
        }}
      />
    </QueryClientProvider>
  );
}

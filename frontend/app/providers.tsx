'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import AuthBootstrap from '@/components/auth/AuthBootstrap';
import ErrorBoundary from '@/components/ErrorBoundary';

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
            staleTime: 30_000,
            gcTime: 300_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap />
      <ErrorBoundary>{children}</ErrorBoundary>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3200,
          style: {
            background: '#1A1A1A',
            color: '#FAFAFA',
            border: '1px solid #2A2A2A',
            borderRadius: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.42)',
          },
          success: {
            iconTheme: {
              primary: '#C9A84C',
              secondary: '#0A0A0A',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#0A0A0A',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

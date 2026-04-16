'use client';

import { RefreshCcw, TriangleAlert } from 'lucide-react';
import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  errorMessage?: string;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('UI error boundary caught an error', error, info);
    }
  }

  onRetry = (): void => {
    this.setState({ hasError: false, errorMessage: undefined });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-bg-secondary/85 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 text-red-400">
            <TriangleAlert size={22} />
          </div>
          <h1 className="mt-4 font-display text-3xl text-text-primary">Something went wrong</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {this.state.errorMessage ?? 'An unexpected error occurred while rendering this view.'}
          </p>

          <button
            type="button"
            onClick={this.onRetry}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent-gold-light"
          >
            <RefreshCcw size={14} />
            Retry
          </button>
        </section>
      </main>
    );
  }
}

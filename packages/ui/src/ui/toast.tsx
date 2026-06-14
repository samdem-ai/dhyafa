'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../lib/cn';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  variant?: ToastVariant;
  title: string;
  description?: string;
  /** ms before auto-dismiss. Errors default to persistent (0). */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'title' | 'variant'>> {
  id: number;
  description?: string;
  duration: number;
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Access the toast dispatcher. Must be used under <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a <ToastProvider>');
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, { wrap: string; icon: React.ReactNode }> = {
  success: {
    wrap: 'border-success/25 bg-success-bg text-success',
    icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
  },
  error: {
    wrap: 'border-error/25 bg-error-bg text-error',
    icon: <AlertCircle className="h-5 w-5" aria-hidden="true" />,
  },
  warning: {
    wrap: 'border-warning/25 bg-warning-bg text-warning',
    icon: <AlertCircle className="h-5 w-5" aria-hidden="true" />,
  },
  info: {
    wrap: 'border-info/25 bg-info-bg text-info',
    icon: <Info className="h-5 w-5" aria-hidden="true" />,
  },
};

/**
 * Toast provider. Renders an aria-live region anchored bottom-end (mirrors to
 * bottom-start in RTL). Success/info auto-dismiss; errors persist until closed.
 */
export function ToastProvider({
  children,
  closeLabel = 'Dismiss',
}: {
  children: React.ReactNode;
  closeLabel?: string;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: ToastOptions) => {
      const variant = opts.variant ?? 'info';
      const id = ++counter.current;
      const duration =
        opts.duration ?? (variant === 'error' ? 0 : 4000);
      const item: ToastItem = {
        id,
        variant,
        title: opts.title,
        description: opts.description,
        duration,
      };
      setToasts((prev) => [...prev.slice(-2), item]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-0 end-0 z-toast flex w-full max-w-sm flex-col gap-sm p-lg"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const styles = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              role={t.variant === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex items-start gap-sm rounded-card border bg-surface p-md shadow-raised',
                'animate-in slide-in-from-bottom-2 fade-in-0 duration-base motion-reduce:animate-none',
                styles.wrap,
              )}
            >
              <span className="mt-px shrink-0">{styles.icon}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-xs">
                <p className="text-body-sm font-semibold text-text-default">{t.title}</p>
                {t.description && (
                  <p className="text-caption text-text-muted">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label={closeLabel}
                className="-me-0.5 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-sm text-text-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

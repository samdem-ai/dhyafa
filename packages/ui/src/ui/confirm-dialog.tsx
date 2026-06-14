'use client';

import { useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** Style the confirm button as destructive (error red). */
  destructive?: boolean;
  /** Require typing this exact string to enable confirm (high-stakes deletes). */
  requireTypeToConfirm?: string;
  typeToConfirmLabel?: string;
  /** Called on confirm. May be async; the confirm button shows a spinner. */
  onConfirm: () => void | Promise<void>;
}

/**
 * Radix AlertDialog confirmation. No outside-click dismissal (must Cancel or
 * Confirm). Default focus lands on Cancel for safety.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  requireTypeToConfirm,
  typeToConfirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [typed, setTyped] = useState('');

  const typeOk = !requireTypeToConfirm || typed === requireTypeToConfirm;

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
      setTyped('');
    }
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) setTyped('');
        onOpenChange(o);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-overlay bg-overlay backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <AlertDialog.Content className="fixed start-1/2 top-1/2 z-modal w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-surface shadow-raised rtl:translate-x-1/2 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none">
          <div className="flex flex-col gap-md p-xl">
            <AlertDialog.Title className="font-display text-heading-3 font-semibold text-primary">
              {title}
            </AlertDialog.Title>
            {body != null && (
              <AlertDialog.Description asChild>
                <div className="text-body-sm text-text-muted">{body}</div>
              </AlertDialog.Description>
            )}

            {requireTypeToConfirm && (
              <label className="flex flex-col gap-xs">
                {typeToConfirmLabel && (
                  <span className="text-caption font-semibold text-text-default">
                    {typeToConfirmLabel}
                  </span>
                )}
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="h-10 w-full rounded-sm border border-border-strong bg-surface px-md text-body-sm text-text-default shadow-xs focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1 focus-visible:ring-offset-bg"
                />
              </label>
            )}

            <div className="mt-sm flex items-center justify-end gap-sm">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  disabled={pending}
                  className="inline-flex h-10 items-center justify-center rounded-sm border border-border-strong bg-surface px-lg text-body-sm font-semibold text-text-default shadow-xs transition-colors duration-fast hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-55"
                >
                  {cancelLabel}
                </button>
              </AlertDialog.Cancel>
              <button
                type="button"
                disabled={pending || !typeOk}
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirm();
                }}
                className={cn(
                  'relative inline-flex h-10 items-center justify-center gap-xs rounded-sm px-lg text-body-sm font-semibold text-text-on-primary shadow-xs transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none',
                  destructive ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary-hover',
                )}
              >
                {pending && (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                )}
                {confirmLabel}
              </button>
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

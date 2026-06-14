'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';

export type ModalSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: ModalSize;
  footer?: React.ReactNode;
  /** aria-label for the close (×) button. */
  closeLabel?: string;
  children?: React.ReactNode;
}

/** Radix Dialog modal — scrim, focus trap, Esc-to-close, restore focus. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  closeLabel = 'Close',
  children,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-overlay bg-overlay backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <Dialog.Content
          className={cn(
            'fixed start-1/2 top-1/2 z-modal w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rtl:translate-x-1/2',
            'rounded-card border border-border bg-surface shadow-raised',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none',
            SIZES[size],
          )}
        >
          <div className="flex items-start justify-between gap-md border-b border-border px-xl py-lg">
            <div className="flex flex-col gap-xs">
              <Dialog.Title className="font-display text-heading-3 font-semibold text-primary">
                {title}
              </Dialog.Title>
              {description != null && (
                <Dialog.Description className="text-body-sm text-text-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label={closeLabel}
              className="-me-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-sm text-text-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {children != null && <div className="px-xl py-lg">{children}</div>}
          {footer != null && (
            <div className="flex items-center justify-end gap-sm border-t border-border px-xl py-lg">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

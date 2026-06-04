'use client';

/**
 * Minimal disclosure: a trigger button that shows/hides its children. Used for
 * "New …" forms and per-row editors on the content pages. Pure client state.
 */

import { useState } from 'react';
import { PlusIcon, CloseIcon } from './icons';

export function Collapsible({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-xs rounded-md border border-border-strong bg-surface px-md text-body-sm font-semibold text-primary shadow-xs transition-colors duration-fast hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {open ? <CloseIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
        {label}
      </button>
      {open && <div className="mt-md">{children}</div>}
    </div>
  );
}

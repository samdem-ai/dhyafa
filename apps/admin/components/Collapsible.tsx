'use client';

/**
 * Minimal disclosure: a trigger button that shows/hides its children. Used for
 * "New …" forms and per-row editors on the content pages. Pure client state.
 */

import { useState } from 'react';

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
        className="rounded-md border border-border-strong bg-surface px-md py-xs text-body-sm font-semibold text-primary hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        {open ? '×' : '+'} {label}
      </button>
      {open && <div className="mt-md">{children}</div>}
    </div>
  );
}

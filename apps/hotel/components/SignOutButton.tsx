'use client';

/**
 * Sign-out: clears the Supabase browser session AND the httpOnly cookie bridge,
 * then sends the user to the sign-in page.
 *
 * Two presentations:
 *   • variant="sidebar" — full-width ghost button on the dark teal rail.
 *   • variant="icon"    — compact icon button for the light top bar.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/client';
import { type Locale } from '@dyafa/i18n';
import { T, tl } from '../lib/dashboard-i18n';
import { LogoutIcon } from './icons';

export function SignOutButton({
  locale,
  variant = 'sidebar',
}: {
  locale: Locale;
  variant?: 'sidebar' | 'icon';
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore — we still clear the cookie below
    }
    try {
      await fetch('/api/session', { method: 'DELETE' });
    } catch {
      // ignore
    }
    router.replace('/sign-in');
    router.refresh();
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onSignOut}
        disabled={pending}
        aria-label={tl(T.signOut, locale)}
        title={tl(T.signOut, locale)}
        className="grid size-9 place-items-center rounded-md border border-border bg-surface text-text-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-error disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-1"
      >
        <LogoutIcon size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-sm rounded-md border border-white/15 bg-white/5 text-teal-100 text-body-sm font-semibold px-md py-sm transition-colors duration-fast hover:bg-white/10 hover:text-text-on-primary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sidebar-bg)]"
    >
      <LogoutIcon size={16} />
      {pending ? tl(T.signingOut, locale) : tl(T.signOut, locale)}
    </button>
  );
}

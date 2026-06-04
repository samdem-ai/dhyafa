'use client';

/**
 * Sign-out control for the admin shell.
 *
 * Clears the browser Supabase session AND the httpOnly cookie bridge
 * (`DELETE /api/session`), then navigates to the sign-in page. Kept as a small
 * client island so the shell itself can stay a Server Component.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/client';
import { C, tl } from '../lib/admin-i18n';
import type { Locale } from '@dyafa/i18n';
import { SignOutIcon } from './icons';

export function SignOutButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      await supabase.auth.signOut();
      await fetch('/api/session', { method: 'DELETE' });
    } catch {
      // best-effort; cookie clear below is authoritative for the server gate
    } finally {
      router.replace('/sign-in');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      title={tl(C.signOut, locale)}
      aria-label={tl(C.signOut, locale)}
      className="inline-flex h-10 items-center gap-xs rounded-md border border-border bg-surface px-md text-body-sm font-semibold text-text-muted shadow-xs transition-colors duration-fast hover:border-error/30 hover:bg-error-bg hover:text-error disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <SignOutIcon className="h-4 w-4" />
      <span className="hidden sm:inline">{pending ? tl(C.loading, locale) : tl(C.signOut, locale)}</span>
    </button>
  );
}

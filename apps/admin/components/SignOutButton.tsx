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
      className="text-body-sm text-teal-200 hover:text-text-on-primary transition-colors duration-fast disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm"
    >
      {pending ? tl(C.loading, locale) : tl(C.signOut, locale)}
    </button>
  );
}

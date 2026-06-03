'use client';

/**
 * Sign-out: clears the Supabase browser session AND the httpOnly cookie bridge,
 * then sends the user to the sign-in page.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase/client';
import { type Locale } from '@dyafa/i18n';
import { T, tl } from '../lib/dashboard-i18n';

export function SignOutButton({ locale }: { locale: Locale }) {
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

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className="w-full rounded-md border border-teal-700 text-teal-100 text-body-sm font-medium px-md py-sm transition-colors duration-fast hover:bg-teal-700 hover:text-text-on-primary disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
    >
      {pending ? tl(T.signingOut, locale) : tl(T.signOut, locale)}
    </button>
  );
}

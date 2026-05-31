'use client';

/**
 * Admin sign-in (email + password).
 *
 * Auth approach (see lib/auth.ts): sign in client-side with the anon Supabase
 * client, then POST the returned tokens to `/api/session` so they're stored as
 * httpOnly cookies. The authoritative admin-role check happens server-side in
 * `requireAdmin()` on every protected page/action — this client only provides a
 * friendly pre-check + UX.
 */

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';
import { dir, type Locale, DEFAULT_LOCALE } from '@dyafa/i18n';

// Inline AR/FR/EN copy (matches the inline-object style used elsewhere).
const T = {
  title: { ar: 'تسجيل الدخول', fr: 'Connexion', en: 'Sign in' },
  brand: { ar: 'دافة', fr: 'Dyafa', en: 'Dyafa' },
  subtitle: {
    ar: 'لوحة تحكم المشرفين',
    fr: 'Console d’administration',
    en: 'Admin console',
  },
  email: { ar: 'البريد الإلكتروني', fr: 'E-mail', en: 'Email' },
  password: { ar: 'كلمة المرور', fr: 'Mot de passe', en: 'Password' },
  submit: { ar: 'دخول', fr: 'Se connecter', en: 'Sign in' },
  submitting: { ar: 'جارٍ الدخول…', fr: 'Connexion…', en: 'Signing in…' },
  errBadCreds: {
    ar: 'بريد إلكتروني أو كلمة مرور غير صحيحة.',
    fr: 'E-mail ou mot de passe incorrect.',
    en: 'Invalid email or password.',
  },
  errNotAdmin: {
    ar: 'هذا الحساب لا يملك صلاحية الوصول إلى لوحة التحكم.',
    fr: 'Ce compte n’a pas accès à la console d’administration.',
    en: 'This account is not authorized for the admin console.',
  },
  errGeneric: {
    ar: 'تعذّر تسجيل الدخول. حاول مرة أخرى.',
    fr: 'Échec de la connexion. Réessayez.',
    en: 'Could not sign in. Please try again.',
  },
} as const;

function resolveLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const m = document.cookie.match(/(?:^|;\s*)dyafa_locale=([^;]+)/);
  const raw = m?.[1];
  if (raw === 'ar' || raw === 'fr' || raw === 'en') return raw;
  return DEFAULT_LOCALE;
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = resolveLocaleFromCookie();
  const direction = dir(locale);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.session) {
        setError(T.errBadCreds[locale]);
        setPending(false);
        return;
      }

      // Friendly pre-check: does this user hold an admin role? (Authoritative
      // check is server-side in requireAdmin(); RLS may restrict this read, so a
      // null result is NOT treated as "definitely not admin" — we let the server
      // decide after the cookie is set.)
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.session.user.id)
        .in('role', ['admin', 'super_admin']);

      // Persist tokens as httpOnly cookies via the session bridge.
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
        }),
      });

      if (!res.ok) {
        setError(T.errGeneric[locale]);
        setPending(false);
        return;
      }

      // If the client could read roles and there were none, fail fast with a
      // clear message (avoids a redirect loop). Otherwise defer to the server.
      if (roleRows && roleRows.length === 0) {
        await supabase.auth.signOut();
        await fetch('/api/session', { method: 'DELETE' });
        setError(T.errNotAdmin[locale]);
        setPending(false);
        return;
      }

      const next = searchParams.get('next');
      const dest = next && next.startsWith('/') ? next : '/moderation';
      // Full navigation so Server Components re-read the new auth cookie.
      router.replace(dest);
      router.refresh();
    } catch {
      setError(T.errGeneric[locale]);
      setPending(false);
    }
  }

  return (
    <main
      dir={direction}
      className="min-h-screen bg-bg flex items-center justify-center px-lg py-2xl"
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-xs mb-xl">
          <span className="font-display text-heading-1 font-semibold text-primary">
            {T.brand[locale]}
          </span>
          <span className="text-body-sm text-text-muted">{T.subtitle[locale]}</span>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-lg"
          noValidate
        >
          <h1 className="font-display text-heading-2 font-semibold text-primary">
            {T.title[locale]}
          </h1>

          {error && (
            <div
              role="alert"
              className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm"
            >
              {error}
            </div>
          )}

          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">
              {T.email[locale]}
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              dir="ltr"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            />
          </label>

          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">
              {T.password[locale]}
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              dir="ltr"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-sm rounded-md bg-accent text-text-on-primary text-body font-semibold px-lg py-md transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            {pending ? T.submitting[locale] : T.submit[locale]}
          </button>
        </form>
      </div>
    </main>
  );
}

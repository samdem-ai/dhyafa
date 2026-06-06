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
import { LocaleSwitcher } from '../../../components/LocaleSwitcher';
import { buttonClass } from '../../../components/ui';

// Inline AR/FR/EN copy (matches the inline-object style used elsewhere).
const T = {
  title: { ar: 'تسجيل الدخول', fr: 'Connexion', en: 'Sign in' },
  brand: { ar: 'دافة', fr: 'Dyafa', en: 'Dyafa' },
  subtitle: {
    ar: 'لوحة تحكم المشرفين',
    fr: 'Console d’administration',
    en: 'Admin console',
  },
  heroTitle: {
    ar: 'أدِر منصة ضيافة بثقة.',
    fr: 'Pilotez la plateforme Dyafa en toute confiance.',
    en: 'Run the Dyafa platform with confidence.',
  },
  heroBody: {
    ar: 'الإشراف، الحجوزات، المدفوعات، والنزاعات — كل ما تحتاجه لإدارة المنصة في مكان واحد.',
    fr: 'Modération, réservations, paiements et litiges — tout ce qu’il faut pour gérer la plateforme, au même endroit.',
    en: 'Moderation, bookings, payments, and disputes — everything you need to operate the platform, in one place.',
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

  const inputCls =
    'h-11 rounded-md border border-border-strong bg-surface px-md text-body text-text-default shadow-xs outline-none transition-[box-shadow,border-color] duration-fast placeholder:text-text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-focus-ring/60';

  return (
    <main dir={direction} className="grid min-h-screen lg:grid-cols-2">
      {/* ── Brand / marketing panel ───────────────────────────────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-teal-900 p-3xl text-text-on-primary lg:flex">
        {/* Warm decorative washes */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -end-24 -top-24 h-80 w-80 rounded-pill bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -start-16 h-80 w-80 rounded-pill bg-teal-600/30 blur-3xl"
        />

        <div className="relative flex items-center justify-between gap-md">
          <div className="flex items-center gap-md">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-accent font-display text-heading-2 font-semibold text-text-on-primary shadow-raised">
              {locale === 'ar' ? 'د' : 'D'}
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-heading-3 font-semibold">{T.brand[locale]}</span>
              <span className="mt-0.5 text-overline font-semibold uppercase tracking-[0.16em] text-teal-200">
                {T.subtitle[locale]}
              </span>
            </span>
          </div>
          <LocaleSwitcher current={locale} />
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-display-lg font-semibold leading-tight">
            {T.heroTitle[locale]}
          </h2>
          <p className="mt-md text-body-lg text-teal-100">{T.heroBody[locale]}</p>
        </div>

        <p className="relative text-caption text-teal-200">© Dyafa</p>
      </aside>

      {/* ── Form panel ────────────────────────────────────────────────────── */}
      <section className="flex items-center justify-center bg-bg px-lg py-3xl">
        <div className="w-full max-w-[400px]">
          {/* Compact brand for mobile (no marketing panel). The language switcher
              is teal-tuned, so it sits in a small dark chip to stay legible on
              the bone panel; on lg+ it lives in the brand panel instead. */}
          <div className="mb-2xl flex items-center justify-between gap-md lg:hidden">
            <div className="flex items-center gap-md">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-accent font-display text-heading-3 font-semibold text-text-on-primary">
                {locale === 'ar' ? 'د' : 'D'}
              </span>
              <span className="font-display text-heading-2 font-semibold text-primary">
                {T.brand[locale]}
              </span>
            </div>
            <div className="rounded-pill bg-teal-900 p-px">
              <LocaleSwitcher current={locale} />
            </div>
          </div>

          <div className="mb-xl flex flex-col gap-xs">
            <h1 className="font-display text-heading-1 font-semibold tracking-tight text-primary">
              {T.title[locale]}
            </h1>
            <p className="text-body-sm text-text-muted">{T.subtitle[locale]}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-lg" noValidate>
            {error && (
              <div
                role="alert"
                className="flex items-start gap-sm rounded-md border border-error/25 bg-error-bg px-md py-sm text-body-sm text-error"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-pill bg-error/15 text-caption font-bold">
                  !
                </span>
                <span>{error}</span>
              </div>
            )}

            <label className="flex flex-col gap-xs">
              <span className="text-caption font-semibold text-text-default">{T.email[locale]}</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                dir="ltr"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className={inputCls}
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
                className={inputCls}
              />
            </label>

            <button
              type="submit"
              disabled={pending}
              className={`mt-sm ${buttonClass({ variant: 'accent', size: 'md', full: true }).replace(
                'h-10',
                'h-11',
              )}`}
            >
              {pending ? T.submitting[locale] : T.submit[locale]}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

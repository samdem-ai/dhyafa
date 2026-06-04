'use client';

/**
 * Hotel dashboard sign-in (email + password).
 *
 * Auth approach (see lib/auth.ts): sign in client-side with the anon Supabase
 * client, then POST the returned tokens to `/api/session` so they're stored as
 * httpOnly cookies. The authoritative host-role + membership check happens
 * server-side in `requireHost()` on every protected page/action — this client
 * only provides a friendly pre-check + UX.
 */

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase/client';
import { dir, type Locale, DEFAULT_LOCALE } from '@dyafa/i18n';
import { T, tl } from '../../../lib/dashboard-i18n';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { inputClass, buttonClass } from '../../../components/ui';
import { BrandMark, CheckCircleIcon, LoginIcon } from '../../../components/icons';

function resolveLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const m = document.cookie.match(/(?:^|;\s*)dyafa_locale=([^;]+)/);
  const raw = m?.[1];
  if (raw === 'ar' || raw === 'fr' || raw === 'en') return raw;
  return DEFAULT_LOCALE;
}

const HOST_ROLES = ['host_individual', 'host_hotel', 'hotel_staff'] as const;

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
        setError(tl(T.errBadCreds, locale));
        setPending(false);
        return;
      }

      // Friendly pre-check: does this user hold a host role? (Authoritative check
      // is server-side; RLS may restrict this read so a null result is NOT taken
      // as "definitely not a host" — we let the server decide after the cookie is set.)
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.session.user.id)
        .in('role', [...HOST_ROLES]);

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
        setError(tl(T.errGeneric, locale));
        setPending(false);
        return;
      }

      // If the client could read roles and there were none, fail fast.
      if (roleRows && roleRows.length === 0) {
        await supabase.auth.signOut();
        await fetch('/api/session', { method: 'DELETE' });
        setError(tl(T.errNotHost, locale));
        setPending(false);
        return;
      }

      const next = searchParams.get('next');
      const dest = next && next.startsWith('/') ? next : '/';
      router.replace(dest);
      router.refresh();
    } catch {
      setError(tl(T.errGeneric, locale));
      setPending(false);
    }
  }

  const features = [
    tl(T.signInFeatureBookings, locale),
    tl(T.signInFeatureRevenue, locale),
    tl(T.signInFeatureTeam, locale),
  ];

  return (
    <main dir={direction} className="min-h-screen bg-bg lg:grid lg:grid-cols-2">
      {/* ── Brand / marketing aside (hidden on small screens) ───────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[color:var(--sidebar-bg)] p-3xl text-text-on-primary lg:flex">
        <div aria-hidden className="absolute inset-0 bg-dotted opacity-[0.06]" />
        <div className="relative flex items-center gap-sm">
          <span className="grid size-11 place-items-center rounded-md bg-white/10">
            <BrandMark size={26} />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-heading-3 font-semibold">{tl(T.brand, locale)}</span>
            <span className="text-overline uppercase tracking-wider text-teal-200/80">
              {tl(T.brandTagline, locale)}
            </span>
          </div>
        </div>

        <div className="relative flex flex-col gap-xl">
          <h2 className="font-display text-display-lg font-semibold leading-tight">
            {tl(T.signInHeadline, locale)}
          </h2>
          <ul className="flex flex-col gap-md">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-md text-body text-teal-100">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/90 text-text-on-primary">
                  <CheckCircleIcon size={16} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <span className="relative text-caption text-teal-200/70">
          © {new Date().getFullYear()} {tl(T.brand, locale)}
        </span>
      </aside>

      {/* ── Form column ─────────────────────────────────────────────────────── */}
      <div className="flex min-h-screen flex-col px-lg py-xl sm:px-2xl">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="flex items-center gap-sm lg:hidden">
            <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <BrandMark size={20} />
            </span>
            <span className="font-display text-heading-3 font-semibold text-primary">
              {tl(T.brand, locale)}
            </span>
          </span>
          <LanguageSwitcher locale={locale} />
        </div>

        <div className="flex flex-1 items-center justify-center py-2xl">
          <div className="w-full max-w-md">
            <div className="mb-xl flex flex-col gap-xs">
              <h1 className="font-display text-display-lg font-semibold text-primary">
                {tl(T.signInTitle, locale)}
              </h1>
              <p className="text-body text-text-muted">{tl(T.signInSubtitle, locale)}</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-lg" noValidate>
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-sm rounded-md border border-error/30 bg-error-bg text-error text-body-sm px-md py-sm"
                >
                  <span aria-hidden className="font-semibold">!</span>
                  <span>{error}</span>
                </div>
              )}

              <label className="flex flex-col gap-xs">
                <span className="text-caption font-semibold text-text-default">
                  {tl(T.email, locale)}
                </span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  dir="ltr"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="flex flex-col gap-xs">
                <span className="text-caption font-semibold text-text-default">
                  {tl(T.password, locale)}
                </span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  dir="ltr"
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className={inputClass}
                />
              </label>

              <button
                type="submit"
                disabled={pending}
                className={buttonClass('accent', 'md', 'mt-sm w-full')}
              >
                <LoginIcon size={18} />
                {pending ? tl(T.signInSubmitting, locale) : tl(T.signInSubmit, locale)}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

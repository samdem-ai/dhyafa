import type { Metadata } from 'next';
import { Fraunces, Plus_Jakarta_Sans, IBM_Plex_Sans_Arabic } from 'next/font/google';
import { cookies } from 'next/headers';
import { dir } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@dyafa/i18n';
import { ToastProvider } from '@dyafa/ui';
import './globals.css';

// ─── Font loading (build-time via next/font — zero layout shift) ─────────────

const fraunces = Fraunces({
  subsets: ['latin'],
  // `wght` is the default axis (implicit for variable fonts) — listing it is a type error.
  axes: ['opsz'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-arabic',
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: 'Dyafa for Hotels — لوحة المضيفين',
  description: 'Hotel and property-manager dashboard for the Dyafa platform',
};

// ─── Locale resolution ────────────────────────────────────────────────────────

function resolveLocale(): Locale {
  const cookieStore = cookies();
  const raw = cookieStore.get('dyafa_locale')?.value;
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return raw as Locale;
  }
  return DEFAULT_LOCALE;
}

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = resolveLocale();
  const direction = dir(locale);

  const fontVars = [
    fraunces.variable,
    plusJakartaSans.variable,
    ibmPlexSansArabic.variable,
  ].join(' ');

  return (
    <html lang={locale} dir={direction} className={fontVars}>
      <body className="min-h-screen bg-bg text-text-default antialiased">
        <ToastProvider closeLabel={locale === 'ar' ? 'إغلاق' : locale === 'fr' ? 'Fermer' : 'Dismiss'}>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

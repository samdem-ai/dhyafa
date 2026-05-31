/**
 * Admin overview — KPI dashboard placeholder.
 *
 * Sections reflected (from docs/06-admin-dashboard.md §1):
 *   • KPI tiles: Bookings, GMV, Commission, Active Listings
 *   • Moderation queue stub
 *   • Quick-nav to all admin routes
 *
 * This is an M0 skeleton — data is hard-coded; real queries hit
 * materialized views (mv_daily_metrics etc.) via Server Components.
 */

import { formatDZD } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@dyafa/i18n';

// ── Locale helper (mirrors layout) ──────────────────────────────────────────
function resolveLocale(): Locale {
  const cookieStore = cookies();
  const raw = cookieStore.get('dyafa_locale')?.value;
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return raw as Locale;
  }
  return DEFAULT_LOCALE;
}

// ── KPI card component ───────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-sm">
      <span className="text-caption font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </span>
      <span
        className={`font-display text-heading-1 font-semibold tabular-nums ${
          accent ? 'text-accent' : 'text-primary'
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-body-sm text-text-muted">{sub}</span>}
    </div>
  );
}

// ── Moderation queue row stub ────────────────────────────────────────────────
function QueueRow({
  title,
  host,
  wilaya,
  status,
}: {
  title: string;
  host: string;
  wilaya: string;
  status: string;
}) {
  return (
    <li className="flex items-center justify-between gap-md py-md border-b border-border last:border-0">
      <div className="flex flex-col gap-xs">
        <span className="text-title font-semibold text-text-default">{title}</span>
        <span className="text-body-sm text-text-muted">
          {host} · {wilaya}
        </span>
      </div>
      <span className="rounded-pill bg-warning-bg text-warning text-caption font-semibold px-md py-xs">
        {status}
      </span>
    </li>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const locale = resolveLocale();

  // Stub data — replace with Server Component queries to mv_daily_metrics
  const kpis = [
    {
      label: locale === 'ar' ? 'الحجوزات (آخر 30 يوم)' : locale === 'fr' ? 'Réservations (30j)' : 'Bookings (30d)',
      value: '1 284',
      sub: locale === 'ar' ? '+12% مقارنة بالشهر الماضي' : locale === 'fr' ? '+12% vs mois dernier' : '+12% vs last month',
    },
    {
      label: locale === 'ar' ? 'إجمالي قيمة المعاملات' : locale === 'fr' ? 'Volume brut (GMV)' : 'Gross Booking Value',
      value: formatDZD(47_600_000, locale),
      sub: locale === 'ar' ? 'آخر 30 يوم' : locale === 'fr' ? 'sur 30 jours' : 'last 30 days',
      accent: true,
    },
    {
      label: locale === 'ar' ? 'عمولة المنصة' : locale === 'fr' ? 'Commission plateforme' : 'Platform Commission',
      value: formatDZD(4_760_000, locale),
      sub: '10%',
    },
    {
      label: locale === 'ar' ? 'إعلانات نشطة' : locale === 'fr' ? 'Annonces actives' : 'Active Listings',
      value: '3 417',
      sub: locale === 'ar' ? '58 ولاية' : locale === 'fr' ? '58 wilayas' : '58 wilayas',
    },
  ] as const;

  const pendingListings = [
    { title: 'فيلا تلمسان', host: 'حمزة بلحاج', wilaya: 'تلمسان', status: locale === 'ar' ? 'قيد المراجعة' : locale === 'fr' ? 'En attente' : 'Pending' },
    { title: 'Dar Béjaïa', host: 'Anis Khaldi', wilaya: 'Béjaïa', status: locale === 'ar' ? 'قيد المراجعة' : locale === 'fr' ? 'En attente' : 'Pending' },
    { title: 'Gîte Ghardaïa', host: 'Salima Rouabah', wilaya: 'Ghardaïa', status: locale === 'ar' ? 'قيد المراجعة' : locale === 'fr' ? 'En attente' : 'Pending' },
  ];

  return (
    <main className="min-h-screen bg-bg">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-header bg-primary px-xl py-md flex items-center justify-between shadow-card">
        <div className="flex items-center gap-md">
          <span className="font-display text-heading-3 font-semibold text-text-on-primary">
            دافة
          </span>
          <span className="text-body-sm text-teal-200">
            {locale === 'ar' ? 'لوحة التحكم' : locale === 'fr' ? 'Administration' : 'Admin'}
          </span>
        </div>
        {/* Locale badge (placeholder — wire up locale switcher later) */}
        <span className="rounded-pill bg-teal-700 text-text-on-primary text-caption font-semibold px-md py-xs uppercase">
          {locale}
        </span>
      </header>

      <div className="max-w-screen-xl mx-auto px-xl py-2xl flex flex-col gap-2xl">

        {/* ── KPI tiles ─────────────────────────────────────────────────── */}
        <section>
          <h1 className="font-display text-heading-1 font-semibold text-primary mb-xl">
            {locale === 'ar' ? 'نظرة عامة' : locale === 'fr' ? "Vue d'ensemble" : 'Overview'}
          </h1>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} accent={'accent' in k && k.accent} />
            ))}
          </div>
        </section>

        {/* ── Moderation queue ──────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-lg">
            <h2 className="font-display text-heading-2 font-semibold text-primary">
              {locale === 'ar' ? 'طابور المراجعة' : locale === 'fr' ? 'File de modération' : 'Moderation Queue'}
            </h2>
            {/* Badge showing pending count */}
            <span className="rounded-pill bg-accent text-text-on-primary text-caption font-semibold px-md py-xs tabular-nums">
              3
            </span>
          </div>
          <div className="rounded-card bg-surface shadow-card px-xl">
            <ul className="divide-y divide-border">
              {pendingListings.map((row) => (
                <QueueRow key={row.title} {...row} />
              ))}
            </ul>
          </div>
          <a
            href="/moderation"
            className="mt-md inline-flex items-center gap-xs text-body-sm font-semibold text-accent hover:opacity-80 transition-opacity duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 rounded-sm"
          >
            {locale === 'ar'
              ? 'فتح طابور المراجعة ←'
              : locale === 'fr'
              ? 'Ouvrir la file de modération →'
              : 'Open moderation queue →'}
          </a>
        </section>

        {/* ── Nav grid (quick links to all admin sections) ──────────────── */}
        <section>
          <h2 className="font-display text-heading-2 font-semibold text-primary mb-lg">
            {locale === 'ar' ? 'الأقسام' : locale === 'fr' ? 'Sections' : 'Sections'}
          </h2>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
            {[
              { href: '/admin/users', ar: 'المستخدمون', fr: 'Utilisateurs', en: 'Users' },
              { href: '/moderation', ar: 'الإعلانات', fr: 'Annonces', en: 'Listings' },
              { href: '/admin/bookings', ar: 'الحجوزات', fr: 'Réservations', en: 'Bookings' },
              { href: '/admin/payments', ar: 'المدفوعات', fr: 'Paiements', en: 'Payments' },
              { href: '/admin/payouts', ar: 'المدفوعات للمضيفين', fr: 'Virements', en: 'Payouts' },
              { href: '/admin/disputes', ar: 'النزاعات', fr: 'Litiges', en: 'Disputes' },
              { href: '/admin/reviews', ar: 'التقييمات', fr: 'Avis', en: 'Reviews' },
              { href: '/admin/audit', ar: 'سجل التدقيق', fr: 'Journal d\'audit', en: 'Audit Log' },
              { href: '/admin/reports', ar: 'التقارير', fr: 'Rapports', en: 'Reports' },
              { href: '/admin/settings', ar: 'الإعدادات', fr: 'Paramètres', en: 'Settings' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-card bg-surface shadow-xs p-lg text-body font-medium text-primary hover:bg-bone-300 hover:shadow-card transition-shadow duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              >
                {item[locale]}
              </a>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}

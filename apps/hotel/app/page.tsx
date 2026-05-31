/**
 * Hotel dashboard overview — KPI dashboard placeholder.
 *
 * Sections reflected (from docs/05-host-experience.md §3):
 *   • KPI tiles: Today's check-ins, Today's check-outs, Occupancy %, Revenue
 *   • Pending-action queue (reservation requests, unanswered messages, rejected listings)
 *   • Reservations stub
 *   • Quick-nav to all dashboard sections
 *
 * This is an M0 skeleton — data is hard-coded; real queries hit
 * host_analytics_daily + bookings via Server Components.
 */

import { formatDZD } from '@dyafa/i18n';
import type { Locale } from '@dyafa/i18n';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@dyafa/i18n';

// ── Locale helper ────────────────────────────────────────────────────────────
function resolveLocale(): Locale {
  const cookieStore = cookies();
  const raw = cookieStore.get('dyafa_locale')?.value;
  if (raw && (SUPPORTED_LOCALES as readonly string[]).includes(raw)) {
    return raw as Locale;
  }
  return DEFAULT_LOCALE;
}

// ── KPI card ─────────────────────────────────────────────────────────────────
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

// ── Reservation row stub ──────────────────────────────────────────────────────
function ReservationRow({
  guest,
  property,
  checkin,
  checkout,
  total,
  status,
  locale,
}: {
  guest: string;
  property: string;
  checkin: string;
  checkout: string;
  total: number;
  status: 'confirmed' | 'pending_host' | 'pending_payment';
  locale: Locale;
}) {
  const statusLabel: Record<typeof status, Record<Locale, string>> = {
    confirmed: { ar: 'مؤكد', fr: 'Confirmé', en: 'Confirmed' },
    pending_host: { ar: 'في انتظار القبول', fr: 'En attente hôte', en: 'Awaiting host' },
    pending_payment: { ar: 'في انتظار الدفع', fr: 'En attente paiement', en: 'Awaiting payment' },
  };
  const statusColor: Record<typeof status, string> = {
    confirmed: 'bg-success-bg text-success',
    pending_host: 'bg-warning-bg text-warning',
    pending_payment: 'bg-info-bg text-info',
  };

  return (
    <li className="flex flex-col gap-xs py-md border-b border-border last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-xs">
        <span className="text-title font-semibold text-text-default">{guest}</span>
        <span className="text-body-sm text-text-muted">
          {property} · {checkin} → {checkout}
        </span>
      </div>
      <div className="flex items-center gap-md">
        <bdi className="text-body font-semibold tabular-nums text-accent">
          {formatDZD(total, locale)}
        </bdi>
        <span className={`rounded-pill text-caption font-semibold px-md py-xs ${statusColor[status]}`}>
          {statusLabel[status][locale]}
        </span>
      </div>
    </li>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HotelDashboardPage() {
  const locale = resolveLocale();

  // Stub KPI data — replace with Server Component queries to host_analytics_daily
  const kpis = [
    {
      label: locale === 'ar' ? 'وصول اليوم' : locale === 'fr' ? 'Arrivées aujourd\'hui' : 'Today\'s check-ins',
      value: '7',
      sub: locale === 'ar' ? 'حجوزات مؤكدة' : locale === 'fr' ? 'réservations confirmées' : 'confirmed bookings',
    },
    {
      label: locale === 'ar' ? 'مغادرة اليوم' : locale === 'fr' ? 'Départs aujourd\'hui' : 'Today\'s check-outs',
      value: '4',
      sub: locale === 'ar' ? 'غرف تُطرح للحجز من جديد' : locale === 'fr' ? 'chambres remises en vente' : 'rooms returning to inventory',
    },
    {
      label: locale === 'ar' ? 'معدل الإشغال (هذا الشهر)' : locale === 'fr' ? 'Taux d\'occupation (mois)' : 'Occupancy (this month)',
      value: '74%',
      sub: locale === 'ar' ? '+6% مقارنة بالشهر الماضي' : locale === 'fr' ? '+6% vs mois dernier' : '+6% vs last month',
    },
    {
      label: locale === 'ar' ? 'الإيرادات (هذا الشهر)' : locale === 'fr' ? 'Revenus (mois)' : 'Revenue (this month)',
      value: formatDZD(1_240_000, locale),
      sub: locale === 'ar' ? 'صافي بعد العمولة' : locale === 'fr' ? 'net après commission' : 'net after commission',
      accent: true,
    },
  ] as const;

  // Stub reservations
  const reservations: {
    guest: string;
    property: string;
    checkin: string;
    checkout: string;
    total: number;
    status: 'confirmed' | 'pending_host' | 'pending_payment';
  }[] = [
    { guest: 'كريم بن علي', property: 'فيلا تلمسان — غرفة دلوكس', checkin: '01/06/2026', checkout: '04/06/2026', total: 96_000, status: 'confirmed' },
    { guest: 'Lamia Boukhari', property: 'Dar Béjaïa — Suite vue mer', checkin: '02/06/2026', checkout: '05/06/2026', total: 120_000, status: 'pending_host' },
    { guest: 'Ahmed Slimani', property: 'Gîte Ghardaïa — Chambre double', checkin: '03/06/2026', checkout: '06/06/2026', total: 54_000, status: 'pending_payment' },
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
            {locale === 'ar' ? 'لوحة المضيفين' : locale === 'fr' ? 'Tableau de bord hôtelier' : 'Hotel Dashboard'}
          </span>
        </div>
        {/* Locale badge */}
        <span className="rounded-pill bg-teal-700 text-text-on-primary text-caption font-semibold px-md py-xs uppercase">
          {locale}
        </span>
      </header>

      <div className="max-w-screen-xl mx-auto px-xl py-2xl flex flex-col gap-2xl">

        {/* ── KPI tiles ─────────────────────────────────────────────────── */}
        <section>
          <h1 className="font-display text-heading-1 font-semibold text-primary mb-xl">
            {locale === 'ar' ? 'نظرة عامة' : locale === 'fr' ? 'Vue d\'ensemble' : 'Overview'}
          </h1>
          <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <KpiCard key={k.label} label={k.label} value={k.value} sub={k.sub} accent={'accent' in k && k.accent} />
            ))}
          </div>
        </section>

        {/* ── Pending-action queue stub ─────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-lg">
            <h2 className="font-display text-heading-2 font-semibold text-primary">
              {locale === 'ar' ? 'إجراءات مطلوبة' : locale === 'fr' ? 'Actions requises' : 'Actions Required'}
            </h2>
            <span className="rounded-pill bg-accent text-text-on-primary text-caption font-semibold px-md py-xs tabular-nums">
              2
            </span>
          </div>
          <div className="rounded-card bg-surface shadow-card px-xl py-md flex flex-col gap-md">
            {[
              {
                icon: '📋',
                text: locale === 'ar' ? 'طلب حجز جديد بانتظار قبولك' : locale === 'fr' ? '1 demande de réservation en attente' : '1 reservation request awaiting response',
                href: '/dashboard/reservations?status=pending_host',
              },
              {
                icon: '💬',
                text: locale === 'ar' ? 'رسالة غير مقروءة من ضيف' : locale === 'fr' ? '1 message non lu d\'un voyageur' : '1 unread message from a guest',
                href: '/dashboard/messages',
              },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center gap-md text-body text-primary hover:text-accent transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 rounded-sm"
              >
                <span aria-hidden>{action.icon}</span>
                <span>{action.text}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── Reservations stub ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-lg">
            <h2 className="font-display text-heading-2 font-semibold text-primary">
              {locale === 'ar' ? 'الحجوزات القادمة' : locale === 'fr' ? 'Réservations à venir' : 'Upcoming Reservations'}
            </h2>
            <a
              href="/dashboard/reservations"
              className="text-body-sm font-medium text-accent hover:text-accent-hover transition-colors duration-fast"
            >
              {locale === 'ar' ? 'عرض الكل' : locale === 'fr' ? 'Voir tout' : 'View all'}
            </a>
          </div>
          <div className="rounded-card bg-surface shadow-card px-xl">
            <ul>
              {reservations.map((r) => (
                <ReservationRow key={`${r.guest}-${r.checkin}`} {...r} locale={locale} />
              ))}
            </ul>
          </div>
        </section>

        {/* ── Nav grid ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="font-display text-heading-2 font-semibold text-primary mb-lg">
            {locale === 'ar' ? 'الأقسام' : locale === 'fr' ? 'Sections' : 'Sections'}
          </h2>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
            {[
              { href: '/dashboard/properties', ar: 'إعلاناتي', fr: 'Mes propriétés', en: 'My Properties' },
              { href: '/dashboard/reservations', ar: 'الحجوزات', fr: 'Réservations', en: 'Reservations' },
              { href: '/dashboard/messages', ar: 'الرسائل', fr: 'Messages', en: 'Messages' },
              { href: '/dashboard/analytics', ar: 'الإحصائيات', fr: 'Analytiques', en: 'Analytics' },
              { href: '/dashboard/payouts', ar: 'المدفوعات', fr: 'Virements', en: 'Payouts' },
              { href: '/dashboard/reviews', ar: 'التقييمات', fr: 'Avis', en: 'Reviews' },
              { href: '/dashboard/staff', ar: 'الفريق', fr: 'Équipe', en: 'Staff' },
              { href: '/dashboard/settings', ar: 'الإعدادات', fr: 'Paramètres', en: 'Settings' },
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

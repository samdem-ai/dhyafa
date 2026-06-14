/**
 * Content / CMS hub — entry points to each managed catalog, with live counts.
 *
 * Server Component, gated by `requireAdmin()`. The actual CRUD lives in the
 * sub-routes; this page is a navigable index so operators can see scope at a
 * glance (active counts per catalog).
 */

import { requireAdmin } from '../../lib/auth';
import { resolveLocale } from '../../lib/i18n';
import { adminSupabase } from '../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import { C, formatInt, tl, type L10n } from '../../lib/admin-i18n';
import { AdminAppShell } from '../../components/AdminAppShell';
import { PageHeader } from '../../components/ui';

export const dynamic = 'force-dynamic';

const T = {
  title: { ar: 'المحتوى', fr: 'Contenu', en: 'Content' },
  subtitle: {
    ar: 'إدارة الواجهة والبيانات المرجعية',
    fr: 'Gestion de la vitrine et des données de référence',
    en: 'Manage the storefront and master data',
  },
  rows: { ar: 'عنصر', fr: 'éléments', en: 'items' },
} as const;

interface HubCard {
  href: string;
  label: L10n;
  desc: L10n;
  count: number;
}

export default async function ContentHubPage() {
  await requireAdmin('/content');
  const locale: Locale = resolveLocale();

  const head = (table: 'featured_collections' | 'promo_banners' | 'home_rails' | 'property_types' | 'amenities' | 'wilayas') =>
    adminSupabase.from(table).select('*', { count: 'exact', head: true });

  const [collections, banners, rails, types, amenities, wilayas] = await Promise.all([
    head('featured_collections'),
    head('promo_banners'),
    head('home_rails'),
    head('property_types'),
    head('amenities'),
    head('wilayas'),
  ]);

  const cards: HubCard[] = [
    {
      href: '/content/collections',
      label: { ar: 'المجموعات المميّزة', fr: 'Collections', en: 'Featured collections' },
      desc: { ar: 'قوائم عقارات منسّقة', fr: 'Listes de logements curées', en: 'Curated property lists' },
      count: collections.count ?? 0,
    },
    {
      href: '/content/banners',
      label: { ar: 'لافتات العروض', fr: 'Bannières promo', en: 'Promo banners' },
      desc: { ar: 'لافتات الصفحة الرئيسية', fr: 'Bannières d’accueil', en: 'Home banners' },
      count: banners.count ?? 0,
    },
    {
      href: '/content/rails',
      label: { ar: 'صفوف الرئيسية', fr: 'Rails d’accueil', en: 'Home rails' },
      desc: { ar: 'ترتيب أقسام الرئيسية', fr: 'Ordre des sections', en: 'Home section order' },
      count: rails.count ?? 0,
    },
    {
      href: '/content/property-types',
      label: { ar: 'أنواع العقارات', fr: 'Types de logement', en: 'Property types' },
      desc: { ar: 'تصنيفات العقارات', fr: 'Catégories', en: 'Categories' },
      count: types.count ?? 0,
    },
    {
      href: '/content/amenities',
      label: { ar: 'المرافق', fr: 'Équipements', en: 'Amenities' },
      desc: { ar: 'مرافق العقارات', fr: 'Commodités', en: 'Property amenities' },
      count: amenities.count ?? 0,
    },
    {
      href: '/content/wilayas',
      label: { ar: 'الولايات والبلديات', fr: 'Wilayas & communes', en: 'Wilayas & communes' },
      desc: { ar: 'تفعيل المناطق', fr: 'Activation des régions', en: 'Region activation' },
      count: wilayas.count ?? 0,
    },
  ];

  return (
    <AdminAppShell locale={locale}>
      <PageHeader title={tl(T.title, locale)} subtitle={tl(T.subtitle, locale)} />

      <section className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-xs hover:shadow-raised transition-shadow duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-center justify-between gap-md">
              <span className="text-title font-semibold text-primary">{tl(card.label, locale)}</span>
              <span className="rounded-pill bg-bone-300 text-text-default text-caption font-semibold px-md py-xs tabular-nums">
                {formatInt(card.count, locale)} {tl(T.rows, locale)}
              </span>
            </div>
            <span className="text-body-sm text-text-muted">{tl(card.desc, locale)}</span>
          </a>
        ))}
      </section>
    </AdminAppShell>
  );
}

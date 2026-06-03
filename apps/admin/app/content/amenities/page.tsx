/**
 * Amenities CMS — create / edit. Localized name + icon + category.
 *
 * Server Component, gated by `requireAdmin()`. Mutations via the content Server
 * Actions (service role + audit).
 */

import { requireAdmin } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { adminSupabase } from '../../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import { C, localized, tl } from '../../../lib/admin-i18n';
import { AdminShell } from '../../../components/AdminShell';
import { SectionCard, TableShell, Th, EmptyState, ErrorState } from '../../../components/ui';
import { Collapsible } from '../../../components/Collapsible';
import { EntityEditor } from '../EntityEditor';

export const dynamic = 'force-dynamic';

const T = {
  title: { ar: 'المرافق', fr: 'Équipements', en: 'Amenities' },
  subtitle: {
    ar: 'المرافق المتاحة للاختيار في الإعلانات',
    fr: 'Commodités sélectionnables dans les annonces',
    en: 'Amenities selectable on listings',
  },
  newOne: { ar: 'مرفق جديد', fr: 'Nouvel équipement', en: 'New amenity' },
  edit: { ar: 'تعديل', fr: 'Modifier', en: 'Edit' },
  colName: { ar: 'الاسم', fr: 'Nom', en: 'Name' },
  colSlug: { ar: 'المعرّف', fr: 'Slug', en: 'Slug' },
  colCategory: { ar: 'الفئة', fr: 'Catégorie', en: 'Category' },
} as const;

interface AmenityRow {
  id: number;
  slug: string;
  name_ar: string | null;
  name_fr: string | null;
  name_en: string | null;
  icon: string | null;
  category: string | null;
}

export default async function AmenitiesPage() {
  await requireAdmin('/content/amenities');
  const locale: Locale = resolveLocale();

  const { data, error } = await adminSupabase
    .from('amenities')
    .select('id, slug, name_ar, name_fr, name_en, icon, category')
    .order('category', { ascending: true, nullsFirst: false })
    .order('slug', { ascending: true });

  const rows = (data ?? []) as AmenityRow[];

  return (
    <AdminShell locale={locale} pathname="/content">
      <section className="flex flex-col gap-xs">
        <a href="/content" className="text-body-sm text-primary hover:underline">
          {tl(C.back, locale)}
        </a>
        <h1 className="font-display text-heading-1 font-semibold text-primary">{tl(T.title, locale)}</h1>
        <p className="text-body-sm text-text-muted">{tl(T.subtitle, locale)}</p>
      </section>

      <Collapsible label={tl(T.newOne, locale)}>
        <SectionCard>
          <EntityEditor kind="amenity" locale={locale} />
        </SectionCard>
      </Collapsible>

      {error && <ErrorState locale={locale} message={error.message} />}
      {!error && rows.length === 0 && <EmptyState locale={locale} />}

      {!error && rows.length > 0 && (
        <TableShell>
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_auto] gap-md px-xl py-md border-b border-border">
            <Th>{tl(T.colName, locale)}</Th>
            <Th>{tl(T.colSlug, locale)}</Th>
            <Th>{tl(T.colCategory, locale)}</Th>
            <Th className="text-end">{tl(T.edit, locale)}</Th>
          </div>
          <ul>
            {rows.map((a) => {
              const name = localized({ ar: a.name_ar, fr: a.name_fr, en: a.name_en }, locale) ?? a.slug;
              return (
                <li key={a.id} className="border-b border-border last:border-0 px-xl py-md">
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_auto] gap-xs md:gap-md items-center">
                    <span className="text-body-sm font-semibold text-text-default">{name}</span>
                    <span className="text-body-sm text-text-muted tabular-nums" dir="ltr">{a.slug}</span>
                    <span className="text-body-sm text-text-muted">{a.category ?? '—'}</span>
                    <div className="md:text-end">
                      <Collapsible label={tl(T.edit, locale)}>
                        <EntityEditor
                          kind="amenity"
                          locale={locale}
                          initial={{
                            id: a.id,
                            slug: a.slug,
                            titleAr: a.name_ar,
                            titleFr: a.name_fr,
                            titleEn: a.name_en,
                            icon: a.icon,
                            category: a.category,
                          }}
                        />
                      </Collapsible>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </TableShell>
      )}
    </AdminShell>
  );
}

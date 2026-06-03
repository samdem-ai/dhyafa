/**
 * Property types CMS — create / edit. Localized name + kind + icon + sort.
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
  title: { ar: 'أنواع العقارات', fr: 'Types de logement', en: 'Property types' },
  subtitle: {
    ar: 'تصنيفات تُستخدم عند نشر الإعلانات',
    fr: 'Catégories utilisées lors de la publication',
    en: 'Categories used when listing properties',
  },
  newOne: { ar: 'نوع جديد', fr: 'Nouveau type', en: 'New type' },
  edit: { ar: 'تعديل', fr: 'Modifier', en: 'Edit' },
  colName: { ar: 'الاسم', fr: 'Nom', en: 'Name' },
  colSlug: { ar: 'المعرّف', fr: 'Slug', en: 'Slug' },
  colKind: { ar: 'النوع', fr: 'Type', en: 'Kind' },
  colEdit: { ar: '', fr: '', en: '' },
} as const;

interface TypeRow {
  id: number;
  slug: string;
  kind: 'single_unit' | 'multi_room';
  name_ar: string | null;
  name_fr: string | null;
  name_en: string | null;
  icon: string | null;
  sort_order: number | null;
}

export default async function PropertyTypesPage() {
  await requireAdmin('/content/property-types');
  const locale: Locale = resolveLocale();

  const { data, error } = await adminSupabase
    .from('property_types')
    .select('id, slug, kind, name_ar, name_fr, name_en, icon, sort_order')
    .order('sort_order', { ascending: true, nullsFirst: false });

  const rows = (data ?? []) as TypeRow[];

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
          <EntityEditor kind="property_type" locale={locale} />
        </SectionCard>
      </Collapsible>

      {error && <ErrorState locale={locale} message={error.message} />}
      {!error && rows.length === 0 && <EmptyState locale={locale} />}

      {!error && rows.length > 0 && (
        <TableShell>
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_auto] gap-md px-xl py-md border-b border-border">
            <Th>{tl(T.colName, locale)}</Th>
            <Th>{tl(T.colSlug, locale)}</Th>
            <Th>{tl(T.colKind, locale)}</Th>
            <Th className="text-end">{tl(T.edit, locale)}</Th>
          </div>
          <ul>
            {rows.map((t) => {
              const name = localized({ ar: t.name_ar, fr: t.name_fr, en: t.name_en }, locale) ?? t.slug;
              return (
                <li key={t.id} className="border-b border-border last:border-0 px-xl py-md flex flex-col gap-sm">
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_auto] gap-xs md:gap-md items-center">
                    <span className="text-body-sm font-semibold text-text-default">{name}</span>
                    <span className="text-body-sm text-text-muted tabular-nums" dir="ltr">{t.slug}</span>
                    <span className="text-body-sm text-text-muted">{t.kind}</span>
                    <div className="md:text-end">
                      <Collapsible label={tl(T.edit, locale)}>
                        <EntityEditor
                          kind="property_type"
                          locale={locale}
                          initial={{
                            id: t.id,
                            slug: t.slug,
                            kindEnum: t.kind,
                            titleAr: t.name_ar,
                            titleFr: t.name_fr,
                            titleEn: t.name_en,
                            icon: t.icon,
                            sortOrder: t.sort_order ?? 0,
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

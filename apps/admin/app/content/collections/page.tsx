/**
 * Featured collections CMS — create, edit, toggle, delete; manage each
 * collection's curated property list (collection_items).
 *
 * Server Component, gated by `requireAdmin()`. Mutations run through the
 * content Server Actions (service role + audit). Item titles are resolved via
 * the joined properties for readability.
 */

import { requireAdmin } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { adminSupabase } from '../../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import { C, localized, tl } from '../../../lib/admin-i18n';
import { AdminShell } from '../../../components/AdminShell';
import { SectionCard, EmptyState, ErrorState } from '../../../components/ui';
import { Collapsible } from '../../../components/Collapsible';
import { EntityEditor } from '../EntityEditor';
import { ActiveToggle, DeleteButton } from '../ContentControls';
import { CollectionItems, type CollectionItem } from './CollectionItems';

export const dynamic = 'force-dynamic';

const T = {
  title: { ar: 'المجموعات المميّزة', fr: 'Collections', en: 'Featured collections' },
  subtitle: {
    ar: 'قوائم العقارات المنسّقة الظاهرة في التطبيق',
    fr: 'Listes de logements curées affichées dans l’app',
    en: 'Curated property lists shown in the app',
  },
  newOne: { ar: 'مجموعة جديدة', fr: 'Nouvelle collection', en: 'New collection' },
  edit: { ar: 'تعديل', fr: 'Modifier', en: 'Edit' },
} as const;

interface CollectionRow {
  id: string;
  slug: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  subtitle_ar: string | null;
  subtitle_fr: string | null;
  subtitle_en: string | null;
  sort_order: number;
  is_active: boolean;
  collection_items: {
    property_id: string;
    sort_order: number;
    properties: { title_ar: string | null; title_fr: string | null; title_en: string | null } | null;
  }[];
}

export default async function CollectionsPage() {
  await requireAdmin('/content/collections');
  const locale: Locale = resolveLocale();

  const { data, error } = await adminSupabase
    .from('featured_collections')
    .select(
      `id, slug, title_ar, title_fr, title_en, subtitle_ar, subtitle_fr, subtitle_en, sort_order, is_active,
       collection_items ( property_id, sort_order, properties ( title_ar, title_fr, title_en ) )`,
    )
    .order('sort_order', { ascending: true });

  const rows = (data ?? []) as unknown as CollectionRow[];

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
          <EntityEditor kind="collection" locale={locale} />
        </SectionCard>
      </Collapsible>

      {error && <ErrorState locale={locale} message={error.message} />}
      {!error && rows.length === 0 && <EmptyState locale={locale} />}

      {!error && rows.length > 0 && (
        <ul className="flex flex-col gap-md">
          {rows.map((col) => {
            const title =
              localized({ ar: col.title_ar, fr: col.title_fr, en: col.title_en }, locale) ?? col.slug;
            const items: CollectionItem[] = [...col.collection_items]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((it) => ({
                propertyId: it.property_id,
                sortOrder: it.sort_order,
                title:
                  localized(
                    {
                      ar: it.properties?.title_ar ?? null,
                      fr: it.properties?.title_fr ?? null,
                      en: it.properties?.title_en ?? null,
                    },
                    locale,
                  ) ?? it.property_id,
              }));

            return (
              <li key={col.id} className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-md">
                <div className="flex items-start justify-between gap-md flex-wrap">
                  <div className="flex flex-col gap-xs min-w-0">
                    <span className="text-title font-semibold text-text-default">{title}</span>
                    <span className="text-caption text-text-muted tabular-nums" dir="ltr">
                      {col.slug} · #{col.sort_order}
                    </span>
                  </div>
                  <div className="flex items-center gap-sm">
                    <ActiveToggle kind="collection" id={col.id} isActive={col.is_active} locale={locale} />
                    <DeleteButton kind="collection" id={col.id} locale={locale} />
                  </div>
                </div>

                <CollectionItems collectionId={col.id} items={items} locale={locale} />

                <Collapsible label={tl(T.edit, locale)}>
                  <EntityEditor
                    kind="collection"
                    locale={locale}
                    initial={{
                      id: col.id,
                      slug: col.slug,
                      titleAr: col.title_ar,
                      titleFr: col.title_fr,
                      titleEn: col.title_en,
                      subAr: col.subtitle_ar,
                      subFr: col.subtitle_fr,
                      subEn: col.subtitle_en,
                      sortOrder: col.sort_order,
                      isActive: col.is_active,
                    }}
                  />
                </Collapsible>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}

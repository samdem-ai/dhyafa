/**
 * Home rails CMS — edit labels, sort order, and active state for the home-screen
 * sections. Rails are app-defined (key + kind are fixed), so this is edit-only
 * (no create / delete).
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
import { EmptyState, ErrorState } from '../../../components/ui';
import { Collapsible } from '../../../components/Collapsible';
import { EntityEditor } from '../EntityEditor';

export const dynamic = 'force-dynamic';

const T = {
  title: { ar: 'صفوف الصفحة الرئيسية', fr: 'Rails d’accueil', en: 'Home rails' },
  subtitle: {
    ar: 'ترتيب وتسمية أقسام الصفحة الرئيسية',
    fr: 'Ordre et libellés des sections d’accueil',
    en: 'Order and labels of the home sections',
  },
  edit: { ar: 'تعديل', fr: 'Modifier', en: 'Edit' },
  active: { ar: 'نشط', fr: 'Actif', en: 'Active' },
  inactive: { ar: 'غير نشط', fr: 'Inactif', en: 'Inactive' },
} as const;

interface RailRow {
  id: string;
  key: string;
  kind: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  sort_order: number;
  is_active: boolean;
}

export default async function RailsPage() {
  await requireAdmin('/content/rails');
  const locale: Locale = resolveLocale();

  const { data, error } = await adminSupabase
    .from('home_rails')
    .select('id, key, kind, title_ar, title_fr, title_en, sort_order, is_active')
    .order('sort_order', { ascending: true });

  const rows = (data ?? []) as RailRow[];

  return (
    <AdminShell locale={locale} pathname="/content">
      <section className="flex flex-col gap-xs">
        <a href="/content" className="text-body-sm text-primary hover:underline">
          {tl(C.back, locale)}
        </a>
        <h1 className="font-display text-heading-1 font-semibold text-primary">{tl(T.title, locale)}</h1>
        <p className="text-body-sm text-text-muted">{tl(T.subtitle, locale)}</p>
      </section>

      {error && <ErrorState locale={locale} message={error.message} />}
      {!error && rows.length === 0 && <EmptyState locale={locale} />}

      {!error && rows.length > 0 && (
        <ul className="flex flex-col gap-md">
          {rows.map((r) => {
            const title = localized({ ar: r.title_ar, fr: r.title_fr, en: r.title_en }, locale) ?? r.key;
            return (
              <li key={r.id} className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-md">
                <div className="flex items-start justify-between gap-md flex-wrap">
                  <div className="flex flex-col gap-xs min-w-0">
                    <span className="text-title font-semibold text-text-default">{title}</span>
                    <span className="text-caption text-text-muted tabular-nums" dir="ltr">
                      {r.key} · {r.kind} · #{r.sort_order}
                    </span>
                  </div>
                  <span
                    className={`rounded-pill text-caption font-semibold px-md py-xs ${
                      r.is_active ? 'bg-success-bg text-success' : 'bg-surface-sunken text-text-muted'
                    }`}
                  >
                    {r.is_active ? tl(T.active, locale) : tl(T.inactive, locale)}
                  </span>
                </div>

                <Collapsible label={tl(T.edit, locale)}>
                  <EntityEditor
                    kind="rail"
                    locale={locale}
                    initial={{
                      id: r.id,
                      titleAr: r.title_ar,
                      titleFr: r.title_fr,
                      titleEn: r.title_en,
                      sortOrder: r.sort_order,
                      isActive: r.is_active,
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

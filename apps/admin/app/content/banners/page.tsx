/**
 * Promo banners CMS — create, edit, toggle, delete. Locale-keyed copy + image
 * path + optional schedule window + target link.
 *
 * Server Component, gated by `requireAdmin()`. Mutations via the content Server
 * Actions (service role + audit).
 */

import { requireAdmin } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { adminSupabase } from '../../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import { C, formatDate, localized, tl } from '../../../lib/admin-i18n';
import { AdminShell } from '../../../components/AdminShell';
import { SectionCard, EmptyState, ErrorState } from '../../../components/ui';
import { Collapsible } from '../../../components/Collapsible';
import { EntityEditor } from '../EntityEditor';
import { ActiveToggle, DeleteButton } from '../ContentControls';

export const dynamic = 'force-dynamic';

const T = {
  title: { ar: 'لافتات العروض', fr: 'Bannières promo', en: 'Promo banners' },
  subtitle: {
    ar: 'لافتات الصفحة الرئيسية مع جدولة وروابط',
    fr: 'Bannières d’accueil avec planification et liens',
    en: 'Home banners with scheduling and links',
  },
  newOne: { ar: 'لافتة جديدة', fr: 'Nouvelle bannière', en: 'New banner' },
  edit: { ar: 'تعديل', fr: 'Modifier', en: 'Edit' },
  window: { ar: 'الفترة', fr: 'Période', en: 'Window' },
} as const;

interface BannerRow {
  id: string;
  image_path: string;
  title_ar: string | null;
  title_fr: string | null;
  title_en: string | null;
  body_ar: string | null;
  body_fr: string | null;
  body_en: string | null;
  target_url: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export default async function BannersPage() {
  await requireAdmin('/content/banners');
  const locale: Locale = resolveLocale();

  const { data, error } = await adminSupabase
    .from('promo_banners')
    .select('id, image_path, title_ar, title_fr, title_en, body_ar, body_fr, body_en, target_url, sort_order, is_active, starts_at, ends_at')
    .order('sort_order', { ascending: true });

  const rows = (data ?? []) as BannerRow[];

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
          <EntityEditor kind="banner" locale={locale} />
        </SectionCard>
      </Collapsible>

      {error && <ErrorState locale={locale} message={error.message} />}
      {!error && rows.length === 0 && <EmptyState locale={locale} />}

      {!error && rows.length > 0 && (
        <ul className="flex flex-col gap-md">
          {rows.map((b) => {
            const title =
              localized({ ar: b.title_ar, fr: b.title_fr, en: b.title_en }, locale) ?? b.image_path;
            return (
              <li key={b.id} className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-md">
                <div className="flex items-start justify-between gap-md flex-wrap">
                  <div className="flex flex-col gap-xs min-w-0">
                    <span className="text-title font-semibold text-text-default">{title}</span>
                    <span className="text-caption text-text-muted tabular-nums" dir="ltr">
                      {b.image_path} · #{b.sort_order}
                    </span>
                    {(b.starts_at || b.ends_at) && (
                      <span className="text-caption text-text-muted tabular-nums">
                        {tl(T.window, locale)}: {formatDate(b.starts_at, locale)} → {formatDate(b.ends_at, locale)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-sm">
                    <ActiveToggle kind="banner" id={b.id} isActive={b.is_active} locale={locale} />
                    <DeleteButton kind="banner" id={b.id} locale={locale} />
                  </div>
                </div>

                <Collapsible label={tl(T.edit, locale)}>
                  <EntityEditor
                    kind="banner"
                    locale={locale}
                    initial={{
                      id: b.id,
                      imagePath: b.image_path,
                      titleAr: b.title_ar,
                      titleFr: b.title_fr,
                      titleEn: b.title_en,
                      bodyAr: b.body_ar,
                      bodyFr: b.body_fr,
                      bodyEn: b.body_en,
                      targetUrl: b.target_url,
                      sortOrder: b.sort_order,
                      isActive: b.is_active,
                      startsAt: b.starts_at ? b.starts_at.slice(0, 16) : null,
                      endsAt: b.ends_at ? b.ends_at.slice(0, 16) : null,
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

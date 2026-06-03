/**
 * Wilayas & communes — read + toggle wilaya activation.
 *
 * Server Component, gated by `requireAdmin()`. Wilayas can be activated /
 * deactivated (controls where the platform operates); communes are read-only
 * here (shown as a per-wilaya count). Toggle runs the content Server Action
 * (service role + audit).
 */

import { requireAdmin } from '../../../lib/auth';
import { resolveLocale } from '../../../lib/i18n';
import { adminSupabase } from '../../../lib/supabase/server';
import type { Locale } from '@dyafa/i18n';
import { C, formatInt, localized, tl } from '../../../lib/admin-i18n';
import { AdminShell } from '../../../components/AdminShell';
import { TableShell, Th, ErrorState } from '../../../components/ui';
import { ActiveToggle } from '../ContentControls';

export const dynamic = 'force-dynamic';

const T = {
  title: { ar: 'الولايات والبلديات', fr: 'Wilayas & communes', en: 'Wilayas & communes' },
  subtitle: {
    ar: 'فعّل أو عطّل المناطق التي تعمل بها المنصة',
    fr: 'Activez ou désactivez les régions desservies',
    en: 'Enable or disable the regions the platform serves',
  },
  colCode: { ar: 'الرمز', fr: 'Code', en: 'Code' },
  colName: { ar: 'الولاية', fr: 'Wilaya', en: 'Wilaya' },
  colCommunes: { ar: 'البلديات', fr: 'Communes', en: 'Communes' },
  colStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
} as const;

interface WilayaRow {
  code: number;
  name_ar: string;
  name_fr: string;
  name_en: string | null;
  is_active: boolean;
}

export default async function WilayasPage() {
  await requireAdmin('/content/wilayas');
  const locale: Locale = resolveLocale();

  const [{ data: wData, error }, { data: communesData }] = await Promise.all([
    adminSupabase
      .from('wilayas')
      .select('code, name_ar, name_fr, name_en, is_active')
      .order('code', { ascending: true }),
    adminSupabase.from('communes').select('wilaya_code'),
  ]);

  const wilayas = (wData ?? []) as WilayaRow[];

  // Count communes per wilaya (read-only).
  const communeCount = new Map<number, number>();
  for (const c of (communesData ?? []) as { wilaya_code: number }[]) {
    communeCount.set(c.wilaya_code, (communeCount.get(c.wilaya_code) ?? 0) + 1);
  }

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

      {!error && (
        <TableShell>
          <div className="hidden md:grid grid-cols-[0.6fr_2fr_1fr_1fr] gap-md px-xl py-md border-b border-border">
            <Th>{tl(T.colCode, locale)}</Th>
            <Th>{tl(T.colName, locale)}</Th>
            <Th className="text-end">{tl(T.colCommunes, locale)}</Th>
            <Th className="text-end">{tl(T.colStatus, locale)}</Th>
          </div>
          <ul>
            {wilayas.map((w) => {
              const name = localized({ ar: w.name_ar, fr: w.name_fr, en: w.name_en }, locale) ?? String(w.code);
              return (
                <li
                  key={w.code}
                  className="grid grid-cols-1 md:grid-cols-[0.6fr_2fr_1fr_1fr] gap-xs md:gap-md px-xl py-md border-b border-border last:border-0 items-center"
                >
                  <span className="text-body-sm text-text-muted tabular-nums">{w.code}</span>
                  <span className="text-body-sm font-semibold text-text-default">{name}</span>
                  <span className="text-body-sm text-text-muted md:text-end tabular-nums">
                    {formatInt(communeCount.get(w.code) ?? 0, locale)}
                  </span>
                  <span className="md:text-end md:justify-self-end">
                    <ActiveToggle kind="wilaya" id={String(w.code)} isActive={w.is_active} locale={locale} />
                  </span>
                </li>
              );
            })}
          </ul>
        </TableShell>
      )}
    </AdminShell>
  );
}

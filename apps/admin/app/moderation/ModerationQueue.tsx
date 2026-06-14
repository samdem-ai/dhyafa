'use client';

/**
 * Moderation queue — client DataTable over pending listings.
 *
 * Receives pre-localized, flattened rows from the server page and renders a
 * sortable @dyafa/ui DataTable with a FilterBar (client-side search across
 * property/host/wilaya). Rows navigate to the detail review page.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DataTable,
  FilterBar,
  type DataTableColumn,
} from '@dyafa/ui';
import type { Locale } from '@dyafa/i18n';
import { M, tl } from '../../lib/moderation-i18n';

export interface QueueRow {
  id: string;
  title: string;
  host: string;
  wilaya: string;
  type: string;
  photoCount: number;
  submitted: string;
  /** ISO for sorting; display is `submitted`. */
  submittedAt: string | null;
}

const PAGE_SIZE = 25;

export function ModerationQueue({ rows, locale }: { rows: QueueRow[]; locale: Locale }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.host.toLowerCase().includes(q) ||
        r.wilaya.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const pageRows = useMemo(
    () => filtered.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE),
    [filtered, pageIndex],
  );

  const columns: DataTableColumn<QueueRow>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: tl(M.colListing, locale),
        cell: ({ row }) => (
          <span className="font-semibold text-text-default">{row.original.title}</span>
        ),
      },
      { accessorKey: 'host', header: tl(M.colHost, locale) },
      { accessorKey: 'wilaya', header: tl(M.colWilaya, locale) },
      { accessorKey: 'type', header: tl(M.colType, locale) },
      {
        accessorKey: 'photoCount',
        header: tl(M.colPhotos, locale),
        align: 'end',
        cell: ({ row }) => <span className="tabular-nums">{row.original.photoCount}</span>,
      },
      {
        accessorKey: 'submittedAt',
        header: tl(M.colSubmitted, locale),
        align: 'end',
        cell: ({ row }) => (
          <span className="tabular-nums text-text-muted">{row.original.submitted}</span>
        ),
      },
    ],
    [locale],
  );

  const rangeLabel = (from: number, to: number, total: number) =>
    locale === 'ar'
      ? `${from}–${to} من ${total}`
      : locale === 'fr'
        ? `${from}–${to} sur ${total}`
        : `${from}–${to} of ${total}`;

  return (
    <div className="flex flex-col gap-lg">
      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPageIndex(0);
        }}
        searchPlaceholder={
          locale === 'ar'
            ? 'ابحث بالعنوان أو المضيف أو الولاية…'
            : locale === 'fr'
              ? 'Rechercher par titre, hôte ou wilaya…'
              : 'Search by title, host, or wilaya…'
        }
      />
      <DataTable<QueueRow>
        columns={columns}
        data={pageRows}
        getRowId={(r) => r.id}
        onRowClick={(r) => router.push(`/moderation/${r.id}`)}
        empty={{
          preset: search ? 'no-results' : 'no-data',
          title: search ? tl(M.emptyTitle, locale) : tl(M.emptyTitle, locale),
          description: search
            ? locale === 'ar'
              ? 'لا توجد إعلانات مطابقة لبحثك.'
              : locale === 'fr'
                ? 'Aucune annonce ne correspond à votre recherche.'
                : 'No listings match your search.'
            : tl(M.emptyBody, locale),
        }}
        pagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          total: filtered.length,
          onPageChange: setPageIndex,
          rangeLabel,
          prevLabel: locale === 'ar' ? 'السابق' : locale === 'fr' ? 'Précédent' : 'Previous',
          nextLabel: locale === 'ar' ? 'التالي' : locale === 'fr' ? 'Suivant' : 'Next',
        }}
        labels={{
          selectRowLabel: locale === 'ar' ? 'تحديد الصف' : locale === 'fr' ? 'Sélectionner la ligne' : 'Select row',
        }}
      />
    </div>
  );
}

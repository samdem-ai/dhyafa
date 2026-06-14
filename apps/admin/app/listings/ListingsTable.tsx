'use client';

/**
 * Listings table — client DataTable over ALL property statuses.
 *
 * Receives pre-localized, flattened rows + the current filter state from the
 * server page. Filters (status / wilaya / search) and offset pagination live in
 * the URL search params (so views are shareable and the server re-queries), so
 * this component pushes URL updates rather than filtering client-side — that is
 * the one deliberate difference from ModerationQueue, which is pending-only and
 * filters in memory.
 *
 * Per-row actions live in a DropdownMenu: Review (always) → /moderation/[id];
 * Suspend (status=approved) and Restore (status=suspended), each guarded by a
 * ConfirmDialog and reporting the outcome via Toast.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import {
  DataTable,
  FilterBar,
  Select,
  Pill,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  useToast,
  statusToPill,
  type DataTableColumn,
} from '@dyafa/ui';
import type { Locale } from '@dyafa/i18n';
import { tl } from '../../lib/admin-i18n';
import {
  L,
  PROPERTY_STATUS_KEYS,
  type PropertyStatusFilter,
} from '../../lib/listings-i18n';
import { suspendListing, restoreListing, type ListingActionResult } from './actions';

export interface ListingRow {
  id: string;
  title: string;
  host: string;
  wilaya: string;
  type: string;
  status: string;
  /** Pre-localized status label for the Pill. */
  statusLabel: string;
  photoCount: number;
  created: string;
}

export interface WilayaOption {
  value: string;
  label: string;
}

const PAGE_SIZE = 25;

const STATUS_LABELS: Record<PropertyStatusFilter, { ar: string; fr: string; en: string }> = {
  pending: L.statusPending,
  approved: L.statusApproved,
  rejected: L.statusRejected,
  suspended: L.statusSuspended,
};

type PendingAction = { kind: 'suspend' | 'restore'; row: ListingRow };

export function ListingsTable({
  rows,
  total,
  pageIndex,
  status,
  wilaya,
  search,
  wilayaOptions,
  locale,
}: {
  rows: ListingRow[];
  total: number;
  pageIndex: number;
  status: PropertyStatusFilter | null;
  wilaya: string | null;
  search: string;
  wilayaOptions: WilayaOption[];
  locale: Locale;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [searchValue, setSearchValue] = useState(search);
  const [pending, setPending] = useState<PendingAction | null>(null);

  /** Build a /listings URL with the given param overrides; resets page on filter change. */
  const buildHref = useCallback(
    (overrides: { status?: string | null; wilaya?: string | null; q?: string | null; page?: number }) => {
      const params = new URLSearchParams();
      const nextStatus = 'status' in overrides ? overrides.status : status;
      const nextWilaya = 'wilaya' in overrides ? overrides.wilaya : wilaya;
      const nextQ = 'q' in overrides ? overrides.q : search;
      const nextPage = overrides.page ?? 0;

      if (nextStatus) params.set('status', nextStatus);
      if (nextWilaya) params.set('wilaya', nextWilaya);
      if (nextQ && nextQ.trim()) params.set('q', nextQ.trim());
      if (nextPage > 0) params.set('page', String(nextPage));

      const qs = params.toString();
      return qs ? `/listings?${qs}` : '/listings';
    },
    [status, wilaya, search],
  );

  // Debounce the free-text search → URL (server re-queries). Skip the initial
  // sync where local state already equals the committed `search`.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchValue.trim() === search.trim()) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      router.push(buildHref({ q: searchValue, page: 0 }));
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchValue, search, buildHref, router]);

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: tl(L.statusAll, locale) },
      ...PROPERTY_STATUS_KEYS.map((k) => ({ value: k, label: tl(STATUS_LABELS[k], locale) })),
    ],
    [locale],
  );

  const wilayaSelectOptions = useMemo(
    () => [{ value: 'all', label: tl(L.wilayaAll, locale) }, ...wilayaOptions],
    [wilayaOptions, locale],
  );

  function handleActionResult(result: ListingActionResult, kind: 'suspend' | 'restore') {
    if (result.ok) {
      toast({
        variant: 'success',
        title: kind === 'suspend' ? tl(L.toastSuspended, locale) : tl(L.toastRestored, locale),
      });
      router.refresh();
    } else {
      toast({ variant: 'error', title: actionErrorMessage(result, locale) });
      if (result.code === 'not_authorized') {
        router.replace(`/sign-in?next=${encodeURIComponent('/listings')}`);
      }
    }
  }

  async function confirmPending() {
    if (!pending) return;
    const { kind, row } = pending;
    const result =
      kind === 'suspend' ? await suspendListing(row.id) : await restoreListing(row.id);
    setPending(null);
    handleActionResult(result, kind);
  }

  const columns: DataTableColumn<ListingRow>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: tl(L.colTitle, locale),
        cell: ({ row }) => (
          <span className="font-semibold text-text-default">{row.original.title}</span>
        ),
      },
      { accessorKey: 'host', header: tl(L.colHost, locale) },
      { accessorKey: 'wilaya', header: tl(L.colWilaya, locale) },
      { accessorKey: 'type', header: tl(L.colType, locale) },
      {
        accessorKey: 'status',
        header: tl(L.colStatus, locale),
        cell: ({ row }) => (
          <Pill variant={statusToPill(row.original.status)} size="sm" dot>
            {row.original.statusLabel}
          </Pill>
        ),
      },
      {
        accessorKey: 'created',
        header: tl(L.colCreated, locale),
        align: 'end',
        cell: ({ row }) => (
          <span className="tabular-nums text-text-muted">{row.original.created}</span>
        ),
      },
      {
        accessorKey: 'photoCount',
        header: tl(L.colPhotos, locale),
        align: 'end',
        cell: ({ row }) => <span className="tabular-nums">{row.original.photoCount}</span>,
      },
      {
        id: 'actions',
        header: '',
        align: 'end',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={tl(L.rowActions, locale)}
                    className="inline-grid h-8 w-8 place-items-center rounded-sm text-text-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => router.push(`/moderation/${r.id}`)}>
                    {tl(L.review, locale)}
                  </DropdownMenuItem>
                  {r.status === 'approved' && (
                    <DropdownMenuItem
                      className="text-error"
                      onSelect={() => setPending({ kind: 'suspend', row: r })}
                    >
                      {tl(L.suspend, locale)}
                    </DropdownMenuItem>
                  )}
                  {r.status === 'suspended' && (
                    <DropdownMenuItem onSelect={() => setPending({ kind: 'restore', row: r })}>
                      {tl(L.restore, locale)}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [locale, router],
  );

  const rangeLabel = (from: number, to: number, count: number) =>
    locale === 'ar'
      ? `${from}–${to} من ${count}`
      : locale === 'fr'
        ? `${from}–${to} sur ${count}`
        : `${from}–${to} of ${count}`;

  const isSuspend = pending?.kind === 'suspend';

  return (
    <div className="flex flex-col gap-lg">
      <FilterBar
        search={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder={tl(L.searchPlaceholder, locale)}
      >
        <div className="min-w-[10rem]">
          <Select
            aria-label={tl(L.statusLabel, locale)}
            options={statusOptions}
            value={status ?? 'all'}
            onChange={(v) => router.push(buildHref({ status: v === 'all' ? null : v, page: 0 }))}
            placeholder={tl(L.statusAll, locale)}
          />
        </div>
        <div className="min-w-[12rem]">
          <Select
            aria-label={tl(L.wilayaLabel, locale)}
            options={wilayaSelectOptions}
            value={wilaya ?? 'all'}
            onChange={(v) => router.push(buildHref({ wilaya: v === 'all' ? null : v, page: 0 }))}
            placeholder={tl(L.wilayaAll, locale)}
            searchable
            searchPlaceholder={tl(L.wilayaLabel, locale)}
          />
        </div>
      </FilterBar>

      <DataTable<ListingRow>
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        onRowClick={(r) => router.push(`/moderation/${r.id}`)}
        empty={{
          preset: search ? 'no-results' : 'no-data',
          title: tl(L.emptyTitle, locale),
          description: search ? tl(L.emptyNoResults, locale) : tl(L.emptyBody, locale),
        }}
        pagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: (next) => router.push(buildHref({ page: next })),
          rangeLabel,
          prevLabel: locale === 'ar' ? 'السابق' : locale === 'fr' ? 'Précédent' : 'Previous',
          nextLabel: locale === 'ar' ? 'التالي' : locale === 'fr' ? 'Suivant' : 'Next',
        }}
        labels={{
          selectRowLabel:
            locale === 'ar' ? 'تحديد الصف' : locale === 'fr' ? 'Sélectionner la ligne' : 'Select row',
        }}
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={isSuspend ? tl(L.confirmSuspendTitle, locale) : tl(L.confirmRestoreTitle, locale)}
        body={isSuspend ? tl(L.confirmSuspendBody, locale) : tl(L.confirmRestoreBody, locale)}
        confirmLabel={isSuspend ? tl(L.suspend, locale) : tl(L.restore, locale)}
        cancelLabel={tl(L.cancel, locale)}
        destructive={isSuspend}
        onConfirm={confirmPending}
      />
    </div>
  );
}

function actionErrorMessage(
  result: Extract<ListingActionResult, { ok: false }>,
  locale: Locale,
): string {
  switch (result.code) {
    case 'not_authorized':
      return tl(L.errorNotAuthorized, locale);
    case 'not_found':
      return tl(L.errorNotFound, locale);
    case 'partial':
      return `${tl(L.actionFailed, locale)}${result.message ? ` — ${result.message}` : ''}`;
    default:
      return `${tl(L.actionFailed, locale)}${result.message ? ` — ${result.message}` : ''}`;
  }
}

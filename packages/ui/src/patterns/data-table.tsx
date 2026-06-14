'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { EmptyState, type EmptyStateProps } from './empty-state';
import { SkeletonTable } from '../ui/skeleton';

export type ColumnAlign = 'start' | 'end' | 'center';

/** A column definition, extended with our align/sortable/width sugar. */
export type DataTableColumn<TData> = ColumnDef<TData, unknown> & {
  align?: ColumnAlign;
};

export interface DataTablePagination {
  pageIndex: number;
  pageSize: number;
  total: number;
  onPageChange: (pageIndex: number) => void;
  /** Labels: ({from},{to},{total}) → "Showing 1–25 of 120". */
  rangeLabel?: (from: number, to: number, total: number) => string;
  prevLabel?: string;
  nextLabel?: string;
}

export type TableDensity = 'comfortable' | 'compact';

export interface DataTableLabels {
  /** Localized error-state copy. */
  errorTitle?: string;
  retryLabel?: string;
  /** "N selected" for the bulk bar. */
  selectedLabel?: (count: number) => string;
  clearSelectionLabel?: string;
  selectRowLabel?: string;
  selectAllLabel?: string;
}

export interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[];
  data: TData[];
  /** Stable row id (used for selection + React keys). */
  getRowId: (row: TData) => string;
  loading?: boolean;
  /** Error message → renders an error state with a Retry button. */
  error?: string | null;
  onRetry?: () => void;
  /** Empty-state config (used when data is empty and not loading/error). */
  empty?: EmptyStateProps;
  onRowClick?: (row: TData) => void;
  /** Enable a leading selection checkbox column + bulk-action bar. */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  /** Rendered in the bulk bar when rows are selected. */
  bulkActions?: React.ReactNode;
  pagination?: DataTablePagination;
  density?: TableDensity;
  labels?: DataTableLabels;
  className?: string;
}

const ALIGN_CLASS: Record<ColumnAlign, string> = {
  start: 'text-start',
  end: 'text-end',
  center: 'text-center',
};

/**
 * Headless TanStack Table rendered with Dyafa primitives. Owns the four states
 * (loading skeleton / error+retry / empty / data), client-side sorting,
 * alignment, optional row selection + bulk bar, and pagination footer.
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  loading = false,
  error = null,
  onRetry,
  empty,
  onRowClick,
  selectable = false,
  selectedIds,
  onSelectionChange,
  bulkActions,
  pagination,
  density = 'comfortable',
  labels,
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const selected = selectedIds ?? new Set<string>();

  const toggleRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectionChange(next);
  };

  const pageIds = useMemo(() => data.map(getRowId), [data, getRowId]);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  const toggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selected);
    for (const id of pageIds) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    onSelectionChange(next);
  };

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
    manualPagination: true,
  });

  const rowPadding = density === 'compact' ? 'py-sm' : 'py-md';

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return <SkeletonTable rows={6} cols={columns.length + (selectable ? 1 : 0)} />;
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-md rounded-card border border-error/25 bg-error-bg px-xl py-3xl text-center"
      >
        <span className="grid h-12 w-12 place-items-center rounded-pill bg-error/10 text-error">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-xs">
          <span className="font-display text-heading-3 font-semibold text-error">
            {labels?.errorTitle ?? 'Something went wrong'}
          </span>
          <p className="mx-auto max-w-sm text-body-sm text-error/90">{error}</p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {labels?.retryLabel ?? 'Retry'}
          </Button>
        )}
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (data.length === 0 && empty) {
    return <EmptyState {...empty} />;
  }

  const selectedCount = selected.size;

  return (
    <div className={cn('flex flex-col gap-md', className)}>
      {selectable && selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-md rounded-card border border-accent/30 bg-accent/8 px-lg py-md">
          <span className="text-body-sm font-semibold text-primary">
            {labels?.selectedLabel ? labels.selectedLabel(selectedCount) : `${selectedCount} selected`}
          </span>
          <div className="flex items-center gap-sm">
            {bulkActions}
            <Button variant="ghost" size="sm" onClick={() => onSelectionChange?.(new Set())}>
              {labels?.clearSelectionLabel ?? 'Clear'}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-body-sm">
            <thead className="sticky top-0 z-base bg-surface-sunken">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border-strong">
                  {selectable && (
                    <th scope="col" className="w-10 px-lg py-md">
                      <Checkbox
                        checked={
                          allOnPageSelected
                            ? true
                            : someOnPageSelected
                              ? 'indeterminate'
                              : false
                        }
                        onCheckedChange={(c) => toggleAll(c === true)}
                        aria-label={labels?.selectAllLabel ?? 'Select all rows'}
                      />
                    </th>
                  )}
                  {headerGroup.headers.map((header) => {
                    const align = (header.column.columnDef as DataTableColumn<TData>).align ?? 'start';
                    const canSort = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          !canSort
                            ? undefined
                            : sortDir === 'asc'
                              ? 'ascending'
                              : sortDir === 'desc'
                                ? 'descending'
                                : 'none'
                        }
                        className={cn(
                          'px-lg py-md text-overline font-semibold uppercase tracking-wide text-text-muted',
                          ALIGN_CLASS[align],
                        )}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn(
                              'inline-flex items-center gap-xs rounded-sm transition-colors duration-fast hover:text-text-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                              align === 'end' && 'flex-row-reverse',
                            )}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sortDir === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : sortDir === 'desc' ? (
                              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row: Row<TData>) => {
                const id = row.id;
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id}
                    data-selected={isSelected || undefined}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    className={cn(
                      'border-b border-border transition-colors duration-fast last:border-0 data-[selected]:bg-accent/8',
                      onRowClick && 'cursor-pointer hover:bg-bone-300',
                    )}
                  >
                    {selectable && (
                      <td className="w-10 px-lg py-md" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => toggleRow(id, c === true)}
                          aria-label={labels?.selectRowLabel ?? 'Select row'}
                        />
                      </td>
                    )}
                    {row.getVisibleCells().map((cell) => {
                      const align = (cell.column.columnDef as DataTableColumn<TData>).align ?? 'start';
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            'px-lg align-middle text-text-default',
                            rowPadding,
                            ALIGN_CLASS[align],
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pagination && pagination.total > 0 && (
          <DataTablePaginationBar {...pagination} />
        )}
      </div>
    </div>
  );
}

function DataTablePaginationBar({
  pageIndex,
  pageSize,
  total,
  onPageChange,
  rangeLabel,
  prevLabel = 'Previous',
  nextLabel = 'Next',
}: DataTablePagination) {
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-md border-t border-border px-lg py-md">
      <span className="text-caption text-text-muted tabular-nums">
        {rangeLabel ? rangeLabel(from, to, total) : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-sm">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(pageIndex - 1)}
          iconStart={<ChevronLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />}
        >
          {prevLabel}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(pageIndex + 1)}
          iconEnd={<ChevronRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

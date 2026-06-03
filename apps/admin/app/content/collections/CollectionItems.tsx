'use client';

/**
 * Manage the property list inside a collection: add by property id (+ sort),
 * remove existing. Calls addCollectionItem / removeCollectionItem Server Actions
 * (admin authz re-checked server-side). Property ids are entered directly — the
 * admin copies them from /moderation or /bookings.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addCollectionItem, removeCollectionItem, type ContentResult } from '../actions';
import { C, tl } from '../../../lib/admin-i18n';
import type { Locale } from '@dyafa/i18n';

const T = {
  items: { ar: 'العقارات', fr: 'Logements', en: 'Properties' },
  propertyId: { ar: 'معرّف العقار (UUID)', fr: 'ID logement (UUID)', en: 'Property id (UUID)' },
  sort: { ar: 'ترتيب', fr: 'Ordre', en: 'Sort' },
  add: { ar: 'إضافة', fr: 'Ajouter', en: 'Add' },
  remove: { ar: 'إزالة', fr: 'Retirer', en: 'Remove' },
  none: { ar: 'لا توجد عقارات', fr: 'Aucun logement', en: 'No properties' },
} as const;

export interface CollectionItem {
  propertyId: string;
  title: string;
  sortOrder: number;
}

const input =
  'rounded-md border border-border-strong bg-surface px-md py-xs text-body-sm text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2';

function err(r: Extract<ContentResult, { ok: false }>, locale: Locale): string {
  if (r.code === 'not_authorized') return tl(C.notAuthorized, locale);
  return `${tl(C.actionFailed, locale)}${r.message ? ` — ${r.message}` : ''}`;
}

export function CollectionItems({
  collectionId,
  items,
  locale,
}: {
  collectionId: string;
  items: CollectionItem[];
  locale: Locale;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState('');
  const [sort, setSort] = useState('0');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAdd() {
    setError(null);
    setPending(true);
    try {
      const r = await addCollectionItem(collectionId, propertyId, Number(sort));
      if (r.ok) {
        setPropertyId('');
        setSort('0');
        router.refresh();
      } else {
        setError(err(r, locale));
        if (r.code === 'not_authorized') router.replace('/sign-in?next=%2Fcontent%2Fcollections');
      }
    } finally {
      setPending(false);
    }
  }

  async function onRemove(pid: string) {
    setError(null);
    setPending(true);
    try {
      const r = await removeCollectionItem(collectionId, pid);
      if (r.ok) router.refresh();
      else setError(err(r, locale));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      <span className="text-caption font-semibold uppercase tracking-wide text-text-muted">
        {tl(T.items, locale)} ({items.length})
      </span>

      {error && <span className="text-caption text-error">{error}</span>}

      {items.length === 0 ? (
        <p className="text-body-sm italic text-text-muted">{tl(T.none, locale)}</p>
      ) : (
        <ul className="flex flex-col gap-xs">
          {items.map((it) => (
            <li
              key={it.propertyId}
              className="flex items-center justify-between gap-md rounded-md border border-border px-md py-xs"
            >
              <span className="text-body-sm text-text-default truncate">
                <span className="tabular-nums text-text-muted">#{it.sortOrder}</span> {it.title}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => onRemove(it.propertyId)}
                className="text-caption font-semibold text-error hover:opacity-80 disabled:opacity-60"
              >
                {tl(T.remove, locale)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-xs">
        <label className="flex flex-col gap-xs flex-1 min-w-[14rem]">
          <span className="text-caption text-text-muted">{tl(T.propertyId, locale)}</span>
          <input dir="ltr" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-xs w-20">
          <span className="text-caption text-text-muted">{tl(T.sort, locale)}</span>
          <input type="number" value={sort} onChange={(e) => setSort(e.target.value)} className={input} />
        </label>
        <button
          type="button"
          disabled={pending || !propertyId.trim()}
          onClick={onAdd}
          className="rounded-md bg-primary text-text-on-primary text-body-sm font-semibold px-lg py-xs transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {pending ? tl(C.submitting, locale) : tl(T.add, locale)}
        </button>
      </div>
    </div>
  );
}

'use client';

/**
 * Shared client islands for the content/CMS pages.
 *
 *   • ActiveToggle  — flip is_active for a collection / banner / wilaya.
 *   • DeleteButton  — confirm-then-delete a collection or banner.
 *
 * Both call the relevant Server Action (admin authz re-checked server-side) and
 * refresh on success. Entity routing is via a small `kind` discriminator so we
 * don't pass Server Action references through props.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  toggleCollectionActive,
  toggleBannerActive,
  toggleWilayaActive,
  deleteCollection,
  deleteBanner,
  type ContentResult,
} from './actions';
import { C, tl } from '../../lib/admin-i18n';
import type { Locale } from '@dyafa/i18n';

export type ToggleKind = 'collection' | 'banner' | 'wilaya';
export type DeleteKind = 'collection' | 'banner';

function err(r: Extract<ContentResult, { ok: false }>, locale: Locale): string {
  if (r.code === 'not_authorized') return tl(C.notAuthorized, locale);
  return `${tl(C.actionFailed, locale)}${r.message ? ` — ${r.message}` : ''}`;
}

const T = {
  active: { ar: 'نشط', fr: 'Actif', en: 'Active' },
  inactive: { ar: 'غير نشط', fr: 'Inactif', en: 'Inactive' },
  delete: { ar: 'حذف', fr: 'Supprimer', en: 'Delete' },
  confirmDelete: { ar: 'تأكيد الحذف؟', fr: 'Confirmer ?', en: 'Confirm delete?' },
} as const;

export function ActiveToggle({
  kind,
  id,
  isActive,
  locale,
}: {
  kind: ToggleKind;
  /** UUID for collection/banner, wilaya code (as string) for wilaya. */
  id: string;
  isActive: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onToggle() {
    setError(null);
    setPending(true);
    try {
      const next = !isActive;
      let r: ContentResult;
      if (kind === 'collection') r = await toggleCollectionActive(id, next);
      else if (kind === 'banner') r = await toggleBannerActive(id, next);
      else r = await toggleWilayaActive(Number(id), next);

      if (r.ok) router.refresh();
      else {
        setError(err(r, locale));
        if (r.code === 'not_authorized') router.replace('/sign-in?next=%2Fcontent');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isActive}
      disabled={pending}
      onClick={onToggle}
      title={error ?? undefined}
      className={`inline-flex items-center gap-xs rounded-pill px-md py-xs text-caption font-semibold transition-colors duration-fast disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 ${
        isActive ? 'bg-success-bg text-success' : 'bg-surface-sunken text-text-muted'
      }`}
    >
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${isActive ? 'bg-success' : 'bg-text-muted'}`}
      />
      {isActive ? tl(T.active, locale) : tl(T.inactive, locale)}
    </button>
  );
}

export function DeleteButton({
  kind,
  id,
  locale,
}: {
  kind: DeleteKind;
  id: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setError(null);
    setPending(true);
    try {
      const r = kind === 'collection' ? await deleteCollection(id) : await deleteBanner(id);
      if (r.ok) router.refresh();
      else {
        setError(err(r, locale));
        if (r.code === 'not_authorized') router.replace('/sign-in?next=%2Fcontent');
      }
    } finally {
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md px-md py-xs text-caption font-semibold text-error border border-error/40 hover:bg-error-bg transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        {tl(T.delete, locale)}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-xs">
      {error && <span className="text-caption text-error">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        className="rounded-md px-md py-xs text-caption font-semibold bg-error text-text-on-primary hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        {pending ? tl(C.submitting, locale) : tl(T.confirmDelete, locale)}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(false)}
        className="rounded-md px-md py-xs text-caption text-text-muted hover:text-text-default"
      >
        {tl(C.cancel, locale)}
      </button>
    </span>
  );
}

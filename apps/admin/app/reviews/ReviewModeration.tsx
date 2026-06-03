'use client';

/**
 * Per-review moderation control: hide / remove / restore. Client island calling
 * the setReviewStatus Server Action (admin authz re-checked server-side). Remove
 * prompts for an optional note; hide/restore are immediate.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setReviewStatus, type ReviewActionResult, type ReviewDecision } from './actions';
import { C, tl } from '../../lib/admin-i18n';
import type { Locale } from '@dyafa/i18n';

const T = {
  hide: { ar: 'إخفاء', fr: 'Masquer', en: 'Hide' },
  remove: { ar: 'حذف', fr: 'Supprimer', en: 'Remove' },
  restore: { ar: 'استعادة', fr: 'Restaurer', en: 'Restore' },
  notePlaceholder: { ar: 'سبب الحذف (اختياري)…', fr: 'Motif (facultatif)…', en: 'Reason (optional)…' },
} as const;

function errorText(r: Extract<ReviewActionResult, { ok: false }>, locale: Locale): string {
  if (r.code === 'not_authorized') return tl(C.notAuthorized, locale);
  return `${tl(C.actionFailed, locale)}${r.message ? ` — ${r.message}` : ''}`;
}

export function ReviewModeration({
  reviewId,
  status,
  locale,
}: {
  reviewId: string;
  status: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [note, setNote] = useState('');

  async function run(decision: ReviewDecision, noteValue?: string) {
    setError(null);
    setPending(true);
    try {
      const r = await setReviewStatus(reviewId, decision, noteValue);
      if (r.ok) {
        setRemoving(false);
        setNote('');
        router.refresh();
      } else {
        setError(errorText(r, locale));
        if (r.code === 'not_authorized') router.replace('/sign-in?next=%2Freviews');
      }
    } finally {
      setPending(false);
    }
  }

  const hidden = status === 'hidden' || status === 'removed';
  const ghost =
    'rounded-md px-md py-xs text-caption font-semibold transition-colors duration-fast disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2';

  return (
    <div className="flex flex-col gap-xs items-end">
      {error && <span className="text-caption text-error">{error}</span>}

      {removing ? (
        <div className="flex flex-col gap-xs w-full max-w-xs">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={tl(T.notePlaceholder, locale)}
            className="rounded-md border border-border-strong bg-surface px-md py-xs text-body-sm text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          />
          <div className="flex items-center gap-xs justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={() => run('removed', note)}
              className={`${ghost} bg-error text-text-on-primary hover:opacity-90`}
            >
              {pending ? tl(C.submitting, locale) : tl(T.remove, locale)}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setRemoving(false)}
              className={`${ghost} text-text-muted hover:text-text-default`}
            >
              {tl(C.cancel, locale)}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-xs">
          {hidden ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run('published')}
              className={`${ghost} bg-success-bg text-success hover:opacity-90`}
            >
              {tl(T.restore, locale)}
            </button>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run('hidden')}
              className={`${ghost} border border-border-strong text-text-muted hover:text-text-default`}
            >
              {tl(T.hide, locale)}
            </button>
          )}
          {status !== 'removed' && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setRemoving(true);
              }}
              className={`${ghost} border border-error/40 text-error hover:bg-error-bg`}
            >
              {tl(T.remove, locale)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

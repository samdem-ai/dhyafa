'use client';

/**
 * Dispute resolution workflow panel. Client island calling the resolveDispute
 * Server Action (admin authz re-checked server-side). "Take under review" is
 * immediate; "Resolve" / "Reject" require a resolution note and notify parties.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveDispute, type DisputeActionResult, type DisputeDecision } from '../actions';
import { C, tl } from '../../../lib/admin-i18n';
import type { Locale } from '@dyafa/i18n';

const T = {
  title: { ar: 'حل النزاع', fr: 'Résolution', en: 'Resolution' },
  takeReview: { ar: 'بدء المراجعة', fr: 'Prendre en charge', en: 'Take under review' },
  resolve: { ar: 'حل لصالح طرف', fr: 'Résoudre', en: 'Resolve' },
  reject: { ar: 'رفض النزاع', fr: 'Rejeter', en: 'Reject' },
  noteLabel: {
    ar: 'ملاحظة الحل (تُرسَل للطرفين)',
    fr: 'Note de résolution (envoyée aux parties)',
    en: 'Resolution note (sent to parties)',
  },
  notePlaceholder: { ar: 'اشرح القرار…', fr: 'Expliquez la décision…', en: 'Explain the decision…' },
  closed: {
    ar: 'تم إغلاق هذا النزاع.',
    fr: 'Ce litige est clôturé.',
    en: 'This dispute is closed.',
  },
} as const;

function errorText(r: Extract<DisputeActionResult, { ok: false }>, locale: Locale): string {
  if (r.code === 'not_authorized') return tl(C.notAuthorized, locale);
  if (r.code === 'invalid_input') return tl(C.reasonRequired, locale);
  return `${tl(C.actionFailed, locale)}${r.message ? ` — ${r.message}` : ''}`;
}

const btnBase =
  'rounded-md text-body font-semibold px-lg py-md transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2';

export function ResolvePanel({
  disputeId,
  status,
  locale,
}: {
  disputeId: string;
  status: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<null | DisputeDecision>(null);
  const [note, setNote] = useState('');

  const closed = status === 'resolved' || status === 'rejected' || status === 'cancelled';

  async function run(decision: DisputeDecision, noteValue?: string) {
    setError(null);
    setPending(true);
    try {
      const r = await resolveDispute(disputeId, decision, noteValue);
      if (r.ok) {
        setMode(null);
        setNote('');
        router.refresh();
      } else {
        setError(errorText(r, locale));
        if (r.code === 'not_authorized') {
          router.replace(`/sign-in?next=${encodeURIComponent(`/disputes/${disputeId}`)}`);
        }
      }
    } finally {
      setPending(false);
    }
  }

  if (closed) {
    return (
      <div className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-sm">
        <h2 className="font-display text-heading-2 font-semibold text-primary">{tl(T.title, locale)}</h2>
        <p className="text-body-sm text-text-muted">{tl(T.closed, locale)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-md">
      <h2 className="font-display text-heading-2 font-semibold text-primary">{tl(T.title, locale)}</h2>

      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}

      {mode === null ? (
        <div className="flex flex-col gap-sm">
          {status === 'open' && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run('under_review')}
              className={`${btnBase} border border-border-strong text-primary`}
            >
              {tl(T.takeReview, locale)}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMode('resolved');
            }}
            className={`${btnBase} bg-success text-text-on-primary`}
          >
            {tl(T.resolve, locale)}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMode('rejected');
            }}
            className={`${btnBase} border border-error/40 text-error hover:bg-error-bg`}
          >
            {tl(T.reject, locale)}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">{tl(T.noteLabel, locale)}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={tl(T.notePlaceholder, locale)}
              className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default outline-none resize-y focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            />
          </label>
          <div className="flex items-center gap-sm">
            <button
              type="button"
              disabled={pending || !note.trim()}
              onClick={() => run(mode, note)}
              className={`${btnBase} ${
                mode === 'resolved' ? 'bg-success text-text-on-primary' : 'bg-error text-text-on-primary'
              }`}
            >
              {pending ? tl(C.submitting, locale) : mode === 'resolved' ? tl(T.resolve, locale) : tl(T.reject, locale)}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMode(null);
                setError(null);
              }}
              className="rounded-md px-lg py-md text-body font-medium text-text-muted hover:text-text-default transition-colors duration-fast disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              {tl(C.cancel, locale)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

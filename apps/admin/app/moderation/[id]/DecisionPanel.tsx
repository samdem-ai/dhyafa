'use client';

/**
 * Approve / Reject decision panel for the listing-review page.
 *
 * Client component: renders the two actions and calls the Server Actions
 * (approveListing / rejectListing). The actions re-verify admin authorization
 * server-side, so this component is purely presentational + form state.
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { approveListing, rejectListing, type ModerationResult } from '../actions';
import {
  M,
  REJECTION_REASONS,
  isRejectionReason,
  type RejectionReason,
} from '../../../lib/moderation-i18n';
import type { Locale } from '@dyafa/i18n';

function errorMessage(result: Extract<ModerationResult, { ok: false }>, locale: Locale): string {
  switch (result.code) {
    case 'not_authorized':
      return M.errorNotAuthorized[locale];
    case 'invalid_input':
      return M.errorReasonRequired[locale];
    case 'not_found':
      return M.notFoundBody[locale];
    case 'partial':
      // Decision applied, but a follow-up write (audit/notification) failed.
      return `${M.errorTitle[locale]}${result.message ? ` — ${result.message}` : ''}`;
    default:
      return `${M.errorTitle[locale]}${result.message ? ` — ${result.message}` : ''}`;
  }
}

export function DecisionPanel({
  propertyId,
  locale,
}: {
  propertyId: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle');
  const [reason, setReason] = useState<RejectionReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | 'approved' | 'rejected'>(null);

  function handleResult(result: ModerationResult) {
    if (result.ok) {
      setError(null);
      setDone(result.status);
      // Refresh server data so the queue / status reflect the decision.
      router.refresh();
    } else {
      setError(errorMessage(result, locale));
      if (result.code === 'not_authorized') {
        // Session lost — send the admin back to sign-in.
        router.replace(`/sign-in?next=${encodeURIComponent(`/moderation/${propertyId}`)}`);
      }
    }
  }

  async function onApprove() {
    setError(null);
    setPending(true);
    try {
      const result = await approveListing(propertyId);
      handleResult(result);
    } finally {
      setPending(false);
    }
  }

  async function onReject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!isRejectionReason(reason)) {
      setError(M.errorReasonRequired[locale]);
      return;
    }
    const chosen = reason;
    const noteValue = note;
    setPending(true);
    try {
      const result = await rejectListing(propertyId, chosen, noteValue);
      handleResult(result);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    const isApproved = done === 'approved';
    return (
      <div
        role="status"
        className={`rounded-card px-xl py-lg flex flex-col gap-xs ${
          isApproved ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'
        }`}
      >
        <span className="text-title font-semibold">
          {isApproved ? M.approved[locale] : M.rejected[locale]}
        </span>
        <a
          href="/moderation"
          className="text-body-sm underline underline-offset-2 hover:opacity-80"
        >
          {M.backToQueue[locale]}
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-lg">
      <h2 className="font-display text-heading-2 font-semibold text-primary">
        {M.decision[locale]}
      </h2>

      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}

      {mode === 'idle' && (
        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <button
              type="button"
              onClick={onApprove}
              disabled={pending}
              className="rounded-md bg-accent text-text-on-primary text-body font-semibold px-lg py-md transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              {pending ? M.submitting[locale] : M.approve[locale]}
            </button>
            <span className="text-caption text-text-muted">{M.approveHint[locale]}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode('rejecting');
            }}
            disabled={pending}
            className="rounded-md border border-error/40 text-error text-body font-semibold px-lg py-md transition-colors duration-fast hover:bg-error-bg disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            {M.reject[locale]}
          </button>
        </div>
      )}

      {mode === 'rejecting' && (
        <form onSubmit={onReject} className="flex flex-col gap-md" noValidate>
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">
              {M.rejectReasonLabel[locale]}
            </span>
            <select
              required
              value={reason}
              onChange={(ev) => setReason(ev.target.value as RejectionReason | '')}
              className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              <option value="" disabled>
                {M.chooseReason[locale]}
              </option>
              {REJECTION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label[locale]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">
              {M.rejectNoteLabel[locale]}
            </span>
            <textarea
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              rows={3}
              placeholder={M.rejectNotePlaceholder[locale]}
              className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default outline-none resize-y focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            />
          </label>

          <div className="flex items-center gap-sm">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-error text-text-on-primary text-body font-semibold px-lg py-md transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              {pending ? M.submitting[locale] : M.reject[locale]}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('idle');
                setError(null);
              }}
              disabled={pending}
              className="rounded-md px-lg py-md text-body font-medium text-text-muted hover:text-text-default transition-colors duration-fast disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              {locale === 'ar' ? 'إلغاء' : locale === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

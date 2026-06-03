'use client';

/**
 * Force-cancel / force-refund panel for a booking. Client island that calls the
 * forceCancelBooking Server Action (which re-verifies admin authz server-side
 * and runs cancel_booking under the admin JWT). Requires a justification and an
 * explicit acknowledge of guest/host impact, per the §4 audit matrix.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { forceCancelBooking, type BookingActionResult } from '../actions';
import { C, tl } from '../../../lib/admin-i18n';
import { formatDZD, type Locale } from '@dyafa/i18n';

const T = {
  title: { ar: 'إجراءات الإدارة', fr: 'Actions admin', en: 'Admin actions' },
  forceCancel: { ar: 'إلغاء قسري + استرداد', fr: 'Annulation forcée + remboursement', en: 'Force-cancel + refund' },
  reasonLabel: {
    ar: 'سبب الإلغاء (يُرسَل للطرفين)',
    fr: 'Motif (envoyé aux deux parties)',
    en: 'Reason (sent to both parties)',
  },
  reasonPlaceholder: { ar: 'وضّح سبب الإلغاء…', fr: 'Expliquez le motif…', en: 'Explain the reason…' },
  ack: {
    ar: 'أُقرّ بأن هذا يؤثّر على الضيف والمضيف وسيُحتسب الاسترداد تلقائيًا.',
    fr: 'Je confirme que cela affecte le voyageur et l’hôte ; le remboursement sera calculé automatiquement.',
    en: 'I acknowledge this affects guest and host; the refund will be computed automatically.',
  },
  doneTitle: { ar: 'تم إلغاء الحجز', fr: 'Réservation annulée', en: 'Booking cancelled' },
  refundAmount: { ar: 'مبلغ الاسترداد', fr: 'Montant remboursé', en: 'Refund amount' },
} as const;

function errorText(r: Extract<BookingActionResult, { ok: false }>, locale: Locale): string {
  if (r.code === 'not_authorized') return tl(C.notAuthorized, locale);
  if (r.code === 'invalid_input') return tl(C.reasonRequired, locale);
  return `${tl(C.actionFailed, locale)}${r.message ? ` — ${r.message}` : ''}`;
}

export function CancelPanel({
  bookingId,
  cancellable,
  locale,
}: {
  bookingId: string;
  /** Whether the booking is in a state that can still be force-cancelled. */
  cancellable: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [ack, setAck] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  async function onConfirm() {
    setError(null);
    setPending(true);
    try {
      const r = await forceCancelBooking(bookingId, reason);
      if (r.ok) {
        setDone(r.refundDzd);
        router.refresh();
      } else {
        setError(errorText(r, locale));
        if (r.code === 'not_authorized') {
          router.replace(`/sign-in?next=${encodeURIComponent(`/bookings/${bookingId}`)}`);
        }
      }
    } finally {
      setPending(false);
    }
  }

  if (done != null) {
    return (
      <div role="status" className="rounded-card bg-warning-bg text-warning px-xl py-lg flex flex-col gap-xs">
        <span className="text-title font-semibold">{tl(T.doneTitle, locale)}</span>
        <span className="text-body-sm">
          {tl(T.refundAmount, locale)}: <bdi className="tabular-nums font-semibold">{formatDZD(done, locale)}</bdi>
        </span>
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

      {!cancellable ? (
        <p className="text-body-sm text-text-muted">
          {locale === 'ar'
            ? 'لا يمكن إلغاء هذا الحجز في حالته الحالية.'
            : locale === 'fr'
              ? 'Cette réservation ne peut pas être annulée dans son état actuel.'
              : 'This booking cannot be cancelled in its current state.'}
        </p>
      ) : !open ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setOpen(true);
          }}
          className="rounded-md border border-error/40 text-error text-body font-semibold px-lg py-md transition-colors duration-fast hover:bg-error-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {tl(T.forceCancel, locale)}
        </button>
      ) : (
        <div className="flex flex-col gap-md">
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">{tl(T.reasonLabel, locale)}</span>
            <textarea
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              rows={3}
              placeholder={tl(T.reasonPlaceholder, locale)}
              className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default outline-none resize-y focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            />
          </label>
          <label className="flex items-start gap-sm text-body-sm text-text-default">
            <input
              type="checkbox"
              checked={ack}
              onChange={(ev) => setAck(ev.target.checked)}
              className="mt-[3px]"
            />
            <span>{tl(T.ack, locale)}</span>
          </label>
          <div className="flex items-center gap-sm">
            <button
              type="button"
              disabled={pending || !reason.trim() || !ack}
              onClick={onConfirm}
              className="rounded-md bg-error text-text-on-primary text-body font-semibold px-lg py-md transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              {pending ? tl(C.submitting, locale) : tl(T.forceCancel, locale)}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
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

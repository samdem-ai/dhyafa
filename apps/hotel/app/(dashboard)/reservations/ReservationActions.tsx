'use client';

/**
 * Per-reservation action controls.
 *   • requested → Accept / Decline (reception allowed)
 *   • confirmed/checked_in/awaiting_payment → Cancel (manager/owner only)
 *
 * The Server Actions re-verify auth + capability; this component is UI + state.
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { type Locale } from '@dyafa/i18n';
import { T, tl } from '../../../lib/dashboard-i18n';
import { buttonClass, inputClass } from '../../../components/ui';
import { CheckCircleIcon, CloseIcon } from '../../../components/icons';
import {
  acceptBookingRequest,
  declineBookingRequest,
  cancelBooking,
  type ReservationResult,
} from './actions';

type Status = 'requested' | 'confirmed' | 'checked_in' | 'awaiting_payment' | 'other';

function errorMessage(result: Extract<ReservationResult, { ok: false }>, locale: Locale): string {
  switch (result.code) {
    case 'forbidden':
      return tl(T.resCancelNoRefundNote, locale);
    case 'not_authorized':
      return tl(T.accessDenied, locale);
    case 'invalid_input':
      return tl(T.errorBody, locale);
    default:
      return `${tl(T.errorTitle, locale)}${result.message ? ` — ${result.message}` : ''}`;
  }
}

export function ReservationActions({
  bookingId,
  status,
  canManage,
  locale,
}: {
  bookingId: string;
  status: Status;
  canManage: boolean;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  function handle(result: ReservationResult) {
    if (result.ok) {
      setError(null);
      setCancelling(false);
      router.refresh();
    } else {
      setError(errorMessage(result, locale));
      if (result.code === 'not_authorized') router.replace('/sign-in?next=/reservations');
    }
  }

  async function run(fn: () => Promise<ReservationResult>) {
    setError(null);
    setPending(true);
    try {
      handle(await fn());
    } finally {
      setPending(false);
    }
  }

  async function onCancelSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (reason.trim().length === 0) {
      setError(tl(T.errorBody, locale));
      return;
    }
    await run(() => cancelBooking(bookingId, reason));
  }

  const canCancel =
    canManage && (status === 'confirmed' || status === 'checked_in' || status === 'awaiting_payment');

  return (
    <div className="flex flex-col gap-sm">
      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}

      {status === 'requested' && (
        <div className="flex flex-wrap items-center gap-sm">
          <button
            type="button"
            onClick={() => run(() => acceptBookingRequest(bookingId))}
            disabled={pending}
            className={buttonClass('accent', 'sm')}
          >
            <CheckCircleIcon size={16} />
            {pending ? tl(T.saving, locale) : tl(T.resAccept, locale)}
          </button>
          <button
            type="button"
            onClick={() => run(() => declineBookingRequest(bookingId))}
            disabled={pending}
            className={buttonClass('danger', 'sm')}
          >
            {tl(T.resDecline, locale)}
          </button>
        </div>
      )}

      {canCancel && !cancelling && (
        <button
          type="button"
          onClick={() => {
            setCancelling(true);
            setError(null);
          }}
          disabled={pending}
          className={buttonClass('secondary', 'sm', 'self-start hover:!text-error hover:!border-error/40')}
        >
          {tl(T.resCancel, locale)}
        </button>
      )}

      {canCancel && cancelling && (
        <form onSubmit={onCancelSubmit} className="flex flex-col gap-sm" noValidate>
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">
              {tl(T.resCancelReason, locale)}
            </span>
            <textarea
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              rows={2}
              required
              placeholder={tl(T.resCancelReasonPh, locale)}
              className={`${inputClass} h-auto resize-y py-sm`}
            />
          </label>
          <div className="flex items-center gap-sm">
            <button
              type="submit"
              disabled={pending}
              className={buttonClass('danger', 'sm')}
            >
              {pending ? tl(T.saving, locale) : tl(T.resCancel, locale)}
            </button>
            <button
              type="button"
              onClick={() => {
                setCancelling(false);
                setError(null);
              }}
              disabled={pending}
              className={buttonClass('ghost', 'sm')}
            >
              <CloseIcon size={15} />
              {tl(T.cancel, locale)}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

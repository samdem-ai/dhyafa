/**
 * CancelBookingSheet (P5b) — the guest cancel flow, shared by the Trips tab and
 * the booking detail screen.
 *
 * When opened it calls quote_refund(bookingId) to get the refund (whole DZD),
 * then shows a ConfirmSheet with the refund amount + the booking's cancellation-
 * tier context. On confirm it calls cancel_booking via useCancelBooking (which
 * invalidates myBookings + the badges), fires a success haptic + toast, and hands
 * the refund back to the parent (so a local detail screen can re-load).
 *
 * Pre-payment bookings (requested / awaiting_payment) never moved money, so we
 * say "nothing to refund" rather than quoting 0 DZD as if a refund were due.
 */

import { useEffect, useState } from 'react';
import type { Locale } from '@dyafa/i18n';
import { formatDZD } from '@dyafa/i18n';
import {
  quoteRefund,
  cancelErrorMessage,
  type BookingWithProperty,
} from '@/lib/bookings';
import { useCancelBooking } from '@/lib/queries';
import { ConfirmSheet, useToast, haptics } from '@/ui';
import { L, pick, cancellationTierCopy } from '@/lib/copy';

export interface CancelBookingSheetProps {
  booking: BookingWithProperty;
  visible: boolean;
  onClose: () => void;
  /** Called after a successful cancel, with the refund amount (whole DZD). */
  onCancelled?: (refundDzd: number) => void;
  locale: Locale;
}

export function CancelBookingSheet({
  booking,
  visible,
  onClose,
  onCancelled,
  locale,
}: CancelBookingSheetProps) {
  const toast = useToast();
  const cancel = useCancelBooking();

  // Pre-payment statuses never captured money → no refund is owed regardless of
  // what quote_refund computes from the tier window.
  const prePayment = booking.status === 'requested' || booking.status === 'awaiting_payment';

  const [quote, setQuote] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Fetch the refund quote when the sheet opens (confirmed bookings only).
  useEffect(() => {
    if (!visible) return;
    if (prePayment) {
      setQuote(0);
      return;
    }
    let active = true;
    setQuoteLoading(true);
    setQuote(null);
    void (async () => {
      try {
        const r = await quoteRefund(booking.id);
        if (active) setQuote(r);
      } catch {
        // Quote is informational; fall back to 0 so the sheet still opens.
        if (active) setQuote(0);
      } finally {
        if (active) setQuoteLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible, prePayment, booking.id]);

  const tier = cancellationTierCopy(booking.cancellation_tier);

  // Build the body: refund line + tier context.
  let refundLine: string;
  if (prePayment) {
    refundLine = pick(L.cancelNoChargeYet, locale);
  } else if (quote != null && quote > 0) {
    refundLine = `${pick(L.cancelRefundFull, locale)} ${formatDZD(quote, locale)}`;
  } else {
    refundLine = pick(L.cancelNoRefund, locale);
  }
  const tierLine = `${pick(L.cancelTierNote, locale)} ${pick(tier.label, locale)} — ${pick(tier.window, locale)}`;
  const message = `${refundLine}\n\n${tierLine}`;

  async function onConfirm() {
    try {
      const refund = await cancel.mutateAsync({ bookingId: booking.id });
      haptics.success();
      onClose();
      toast.show({
        message: refund > 0 ? pick(L.cancelSuccessRefund, locale) : pick(L.cancelSuccessNoRefund, locale),
        tone: 'success',
      });
      onCancelled?.(refund);
    } catch (e) {
      haptics.error();
      onClose();
      toast.show({ message: cancelErrorMessage(e, locale), tone: 'error' });
    }
  }

  return (
    <ConfirmSheet
      visible={visible}
      onClose={onClose}
      title={pick(L.cancelBookingTitle, locale)}
      message={quoteLoading ? '…' : message}
      confirmLabel={pick(L.cancelConfirm, locale)}
      cancelLabel={pick(L.cancelKeep, locale)}
      onConfirm={() => void onConfirm()}
      loading={cancel.isPending}
    />
  );
}

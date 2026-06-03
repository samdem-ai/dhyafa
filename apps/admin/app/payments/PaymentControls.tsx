'use client';

/**
 * Client islands for the payments page:
 *   • RunPayoutsForm — pick a period and call run_payouts (admin-JWT path).
 *   • MarkPaidButton — mark a single payout paid (service-role path).
 *   • RefundButton — record a manual refund against a transaction.
 *
 * All call Server Actions that re-verify admin authz server-side; this file is
 * presentational + form state only.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  runPayouts,
  markPayoutPaid,
  markTransactionRefunded,
  type PaymentActionResult,
} from './actions';
import { C, formatInt, tl } from '../../lib/admin-i18n';
import { formatDZD, type Locale } from '@dyafa/i18n';

const T = {
  runTitle: { ar: 'توليد المدفوعات', fr: 'Générer les virements', en: 'Generate payouts' },
  periodStart: { ar: 'من تاريخ', fr: 'Début de période', en: 'Period start' },
  periodEnd: { ar: 'إلى تاريخ', fr: 'Fin de période', en: 'Period end' },
  run: { ar: 'توليد', fr: 'Générer', en: 'Run' },
  generated: { ar: 'تم توليد', fr: 'Générés', en: 'Generated' },
  payouts: { ar: 'مدفوعات', fr: 'virements', en: 'payouts' },
  markPaid: { ar: 'تعليم كمدفوع', fr: 'Marquer payé', en: 'Mark paid' },
  refTitle: { ar: 'مرجع التحويل', fr: 'Référence du virement', en: 'Transfer reference' },
  refPlaceholder: { ar: 'مرجع البنك/CCP…', fr: 'Réf. banque/CCP…', en: 'Bank/CCP reference…' },
  refund: { ar: 'استرداد', fr: 'Rembourser', en: 'Refund' },
  refundAmount: { ar: 'مبلغ الاسترداد', fr: 'Montant à rembourser', en: 'Refund amount' },
  refundReason: { ar: 'سبب الاسترداد', fr: 'Motif du remboursement', en: 'Refund reason' },
  invalidPeriod: {
    ar: 'حدّد فترة صحيحة.',
    fr: 'Indiquez une période valide.',
    en: 'Pick a valid period.',
  },
} as const;

function errorText(r: Extract<PaymentActionResult, { ok: false }>, locale: Locale): string {
  if (r.code === 'not_authorized') return tl(C.notAuthorized, locale);
  if (r.code === 'invalid_input') return tl(T.invalidPeriod, locale);
  return `${tl(C.actionFailed, locale)}${r.message ? ` — ${r.message}` : ''}`;
}

const btnPrimary =
  'rounded-md bg-accent text-text-on-primary text-body-sm font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2';
const inputCls =
  'rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2';

// ── Run payouts ──────────────────────────────────────────────────────────────

export function RunPayoutsForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  async function onRun() {
    setError(null);
    setPending(true);
    try {
      const r = await runPayouts(start, end);
      if (r.ok) {
        setDone(Number(r.info ?? '0'));
        router.refresh();
      } else {
        setError(errorText(r, locale));
        if (r.code === 'not_authorized') router.replace('/sign-in?next=%2Fpayments');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-md">
      <h2 className="font-display text-heading-2 font-semibold text-primary">{tl(T.runTitle, locale)}</h2>
      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}
      {done != null && (
        <div role="status" className="rounded-md bg-success-bg text-success text-body-sm px-md py-sm">
          {tl(T.generated, locale)}: {formatInt(done, locale)} {tl(T.payouts, locale)}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-sm">
        <label className="flex flex-col gap-xs">
          <span className="text-caption font-semibold text-text-default">{tl(T.periodStart, locale)}</span>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="text-caption font-semibold text-text-default">{tl(T.periodEnd, locale)}</span>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls} />
        </label>
        <button type="button" disabled={pending || !start || !end} onClick={onRun} className={btnPrimary}>
          {pending ? tl(C.submitting, locale) : tl(T.run, locale)}
        </button>
      </div>
    </div>
  );
}

// ── Mark a payout paid ─────────────────────────────────────────────────────────

export function MarkPaidButton({ payoutId, locale }: { payoutId: string; locale: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    setPending(true);
    try {
      const r = await markPayoutPaid(payoutId, reference);
      if (r.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(errorText(r, locale));
        if (r.code === 'not_authorized') router.replace('/sign-in?next=%2Fpayments');
      }
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={btnPrimary}>
        {tl(T.markPaid, locale)}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-xs">
      {error && <span className="text-caption text-error">{error}</span>}
      <input
        type="text"
        dir="ltr"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder={tl(T.refPlaceholder, locale)}
        className={inputCls}
      />
      <div className="flex items-center gap-xs">
        <button type="button" disabled={pending} onClick={onConfirm} className={btnPrimary}>
          {pending ? tl(C.submitting, locale) : tl(T.markPaid, locale)}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="rounded-md px-md py-sm text-body-sm text-text-muted hover:text-text-default"
        >
          {tl(C.cancel, locale)}
        </button>
      </div>
    </div>
  );
}

// ── Record a manual refund against a transaction ─────────────────────────────

export function RefundButton({
  txnId,
  maxRefund,
  locale,
}: {
  txnId: string;
  /** Remaining refundable amount (amount_dzd - refunded_dzd). */
  maxRefund: number;
  locale: Locale;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(maxRefund));
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    setPending(true);
    try {
      const r = await markTransactionRefunded(txnId, Number(amount), reason);
      if (r.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(errorText(r, locale));
        if (r.code === 'not_authorized') router.replace('/sign-in?next=%2Fpayments');
      }
    } finally {
      setPending(false);
    }
  }

  if (maxRefund <= 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-error/40 text-error text-body-sm font-semibold px-lg py-sm transition-colors duration-fast hover:bg-error-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        {tl(T.refund, locale)}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-xs w-full max-w-sm">
      {error && <span className="text-caption text-error">{error}</span>}
      <label className="flex flex-col gap-xs">
        <span className="text-caption font-semibold text-text-default">
          {tl(T.refundAmount, locale)} (≤ <bdi className="tabular-nums">{formatDZD(maxRefund, locale)}</bdi>)
        </span>
        <input
          type="number"
          min={1}
          max={maxRefund}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-xs">
        <span className="text-caption font-semibold text-text-default">{tl(T.refundReason, locale)}</span>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
      </label>
      <div className="flex items-center gap-xs">
        <button
          type="button"
          disabled={pending || !reason.trim()}
          onClick={onConfirm}
          className="rounded-md bg-error text-text-on-primary text-body-sm font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {pending ? tl(C.submitting, locale) : tl(T.refund, locale)}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setOpen(false)}
          className="rounded-md px-md py-sm text-body-sm text-text-muted hover:text-text-default"
        >
          {tl(C.cancel, locale)}
        </button>
      </div>
    </div>
  );
}

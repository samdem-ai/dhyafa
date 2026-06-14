'use client';

/**
 * Approve / Reject decision panel for the listing-review page.
 *
 * Client component built on @dyafa/ui primitives: Approve uses the `success`
 * Button variant (NOT terracotta accent), Reject uses `destructive`. Both go
 * through a ConfirmDialog and surface the outcome as a Toast. The underlying
 * server actions (approveListing / rejectListing) are unchanged — they re-verify
 * admin authorization server-side, so this component is presentational + state.
 */

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Select,
  Textarea,
  useToast,
} from '@dyafa/ui';
import { Check, X } from 'lucide-react';
import { approveListing, rejectListing, type ModerationResult } from '../actions';
import {
  M,
  REJECTION_REASONS,
  isRejectionReason,
  tl,
  type RejectionReason,
} from '../../../lib/moderation-i18n';
import type { Locale } from '@dyafa/i18n';

function errorMessage(result: Extract<ModerationResult, { ok: false }>, locale: Locale): string {
  switch (result.code) {
    case 'not_authorized':
      return tl(M.errorNotAuthorized, locale);
    case 'invalid_input':
      return tl(M.errorReasonRequired, locale);
    case 'not_found':
      return tl(M.notFoundBody, locale);
    case 'partial':
      return `${tl(M.errorTitle, locale)}${result.message ? ` — ${result.message}` : ''}`;
    default:
      return `${tl(M.errorTitle, locale)}${result.message ? ` — ${result.message}` : ''}`;
  }
}

export function DecisionPanel({ propertyId, locale }: { propertyId: string; locale: Locale }) {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle');
  const [reason, setReason] = useState<RejectionReason | ''>('');
  const [note, setNote] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  function handleResult(result: ModerationResult, kind: 'approved' | 'rejected') {
    if (result.ok) {
      toast({
        variant: 'success',
        title: kind === 'approved' ? tl(M.toastApproved, locale) : tl(M.toastRejected, locale),
      });
      router.refresh();
    } else {
      toast({ variant: 'error', title: errorMessage(result, locale) });
      if (result.code === 'not_authorized') {
        router.replace(`/sign-in?next=${encodeURIComponent(`/moderation/${propertyId}`)}`);
      }
    }
  }

  async function doApprove() {
    const result = await approveListing(propertyId);
    setConfirmApprove(false);
    handleResult(result, 'approved');
  }

  async function doReject() {
    if (!isRejectionReason(reason)) {
      setConfirmReject(false);
      return;
    }
    const result = await rejectListing(propertyId, reason, note);
    setConfirmReject(false);
    handleResult(result, 'rejected');
  }

  function onRejectSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isRejectionReason(reason)) {
      setReasonError(tl(M.errorReasonRequired, locale));
      return;
    }
    setReasonError(null);
    setConfirmReject(true);
  }

  return (
    <Card title={tl(M.decision, locale)} padding="lg">
      {mode === 'idle' ? (
        <div className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <Button
              variant="success"
              fullWidth
              iconStart={<Check className="h-4 w-4" aria-hidden="true" />}
              onClick={() => setConfirmApprove(true)}
            >
              {tl(M.approve, locale)}
            </Button>
            <span className="text-caption text-text-muted">{tl(M.approveHint, locale)}</span>
          </div>

          <Button
            variant="destructive"
            fullWidth
            iconStart={<X className="h-4 w-4" aria-hidden="true" />}
            onClick={() => {
              setReasonError(null);
              setMode('rejecting');
            }}
          >
            {tl(M.reject, locale)}
          </Button>
        </div>
      ) : (
        <form onSubmit={onRejectSubmit} className="flex flex-col gap-md" noValidate>
          <FormField label={tl(M.rejectReasonLabel, locale)} error={reasonError ?? undefined} required>
            {(ids) => (
              <Select
                {...ids}
                options={REJECTION_REASONS.map((r) => ({ value: r.value, label: tl(r.label, locale) }))}
                value={reason || null}
                onChange={(v) => {
                  setReason(v as RejectionReason);
                  setReasonError(null);
                }}
                placeholder={tl(M.chooseReason, locale)}
              />
            )}
          </FormField>

          <FormField label={tl(M.rejectNoteLabel, locale)}>
            {(ids) => (
              <Textarea
                {...ids}
                value={note}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
                rows={3}
                placeholder={tl(M.rejectNotePlaceholder, locale)}
              />
            )}
          </FormField>

          <div className="flex items-center gap-sm">
            <Button type="submit" variant="destructive">
              {tl(M.reject, locale)}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode('idle');
                setReasonError(null);
              }}
            >
              {tl(M.cancel, locale)}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmApprove}
        onOpenChange={setConfirmApprove}
        title={tl(M.confirmApproveTitle, locale)}
        body={tl(M.confirmApproveBody, locale)}
        confirmLabel={tl(M.approve, locale)}
        cancelLabel={tl(M.cancel, locale)}
        onConfirm={doApprove}
      />
      <ConfirmDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title={tl(M.confirmRejectTitle, locale)}
        body={tl(M.confirmRejectBody, locale)}
        confirmLabel={tl(M.reject, locale)}
        cancelLabel={tl(M.cancel, locale)}
        destructive
        onConfirm={doReject}
      />
    </Card>
  );
}

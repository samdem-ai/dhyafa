'use client';

/**
 * Account actions for a user profile: suspend / unsuspend, and (if the user is a
 * host) verify identity. Client island that calls the Server Actions, which
 * re-verify admin authorization server-side. Suspension requires a reason.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { suspendUser, unsuspendUser, verifyHost, type UserActionResult } from '../actions';
import { C, tl } from '../../../lib/admin-i18n';
import type { Locale } from '@dyafa/i18n';

const T = {
  suspend: { ar: 'تعليق الحساب', fr: 'Suspendre', en: 'Suspend' },
  unsuspend: { ar: 'إعادة التفعيل', fr: 'Réactiver', en: 'Reactivate' },
  verify: { ar: 'التحقق من المضيف', fr: 'Vérifier l’hôte', en: 'Verify host' },
  verified: { ar: 'تم التحقق ✓', fr: 'Vérifié ✓', en: 'Verified ✓' },
  suspendReason: {
    ar: 'سبب التعليق (يُرسَل للمستخدم)',
    fr: 'Motif de suspension (envoyé à l’utilisateur)',
    en: 'Suspension reason (sent to the user)',
  },
  reasonPlaceholder: {
    ar: 'وضّح سبب التعليق…',
    fr: 'Expliquez le motif…',
    en: 'Explain the reason…',
  },
  accountActions: { ar: 'إجراءات الحساب', fr: 'Actions du compte', en: 'Account actions' },
} as const;

function errorText(r: Extract<UserActionResult, { ok: false }>, locale: Locale): string {
  if (r.code === 'not_authorized') return tl(C.notAuthorized, locale);
  if (r.code === 'invalid_input') return tl(C.reasonRequired, locale);
  return `${tl(C.actionFailed, locale)}${r.message ? ` — ${r.message}` : ''}`;
}

export function UserActionsPanel({
  userId,
  isActive,
  hostProfileId,
  identityStatus,
  locale,
}: {
  userId: string;
  isActive: boolean;
  hostProfileId: string | null;
  identityStatus: string | null;
  locale: Locale;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<'idle' | 'suspending'>('idle');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handle(r: UserActionResult) {
    if (r.ok) {
      setError(null);
      setMode('idle');
      setReason('');
      router.refresh();
    } else {
      setError(errorText(r, locale));
      if (r.code === 'not_authorized') {
        router.replace(`/sign-in?next=${encodeURIComponent(`/users/${userId}`)}`);
      }
    }
  }

  async function run(fn: () => Promise<UserActionResult>) {
    setError(null);
    setPending(true);
    try {
      handle(await fn());
    } finally {
      setPending(false);
    }
  }

  const alreadyVerified = identityStatus === 'verified';

  return (
    <div className="rounded-card bg-surface shadow-card p-xl flex flex-col gap-md">
      <h2 className="font-display text-heading-2 font-semibold text-primary">
        {tl(T.accountActions, locale)}
      </h2>

      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}

      {/* Host verification */}
      {hostProfileId && (
        <button
          type="button"
          disabled={pending || alreadyVerified}
          onClick={() => run(() => verifyHost(hostProfileId))}
          className="rounded-md bg-accent text-text-on-primary text-body font-semibold px-lg py-md transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {alreadyVerified ? tl(T.verified, locale) : tl(T.verify, locale)}
        </button>
      )}

      {/* Suspend / unsuspend */}
      {isActive ? (
        mode === 'idle' ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setMode('suspending');
            }}
            className="rounded-md border border-error/40 text-error text-body font-semibold px-lg py-md transition-colors duration-fast hover:bg-error-bg disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            {tl(T.suspend, locale)}
          </button>
        ) : (
          <div className="flex flex-col gap-sm">
            <label className="flex flex-col gap-xs">
              <span className="text-caption font-semibold text-text-default">
                {tl(T.suspendReason, locale)}
              </span>
              <textarea
                value={reason}
                onChange={(ev) => setReason(ev.target.value)}
                rows={3}
                placeholder={tl(T.reasonPlaceholder, locale)}
                className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default outline-none resize-y focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              />
            </label>
            <div className="flex items-center gap-sm">
              <button
                type="button"
                disabled={pending || !reason.trim()}
                onClick={() => run(() => suspendUser(userId, reason))}
                className="rounded-md bg-error text-text-on-primary text-body font-semibold px-lg py-md transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              >
                {pending ? tl(C.submitting, locale) : tl(T.suspend, locale)}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setMode('idle');
                  setError(null);
                }}
                className="rounded-md px-lg py-md text-body font-medium text-text-muted hover:text-text-default transition-colors duration-fast disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              >
                {tl(C.cancel, locale)}
              </button>
            </div>
          </div>
        )
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => unsuspendUser(userId))}
          className="rounded-md bg-success text-text-on-primary text-body font-semibold px-lg py-md transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {pending ? tl(C.submitting, locale) : tl(T.unsuspend, locale)}
        </button>
      )}
    </div>
  );
}

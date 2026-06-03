'use client';

/**
 * Reply form for a single review (one reply per review). When a reply already
 * exists, it is shown read-only by the parent; this component renders only when
 * the host can still reply.
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { type Locale } from '@dyafa/i18n';
import { T, tl } from '../../../lib/dashboard-i18n';
import { replyToReview, type ReviewResult } from './actions';

export function ReviewReply({
  reviewId,
  locale,
}: {
  reviewId: string;
  locale: Locale;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (body.trim().length === 0) return;
    setPending(true);
    setError(null);
    try {
      const result: ReviewResult = await replyToReview(reviewId, body);
      if (result.ok) {
        setOpen(false);
        setBody('');
        router.refresh();
      } else {
        setError(
          result.code === 'not_authorized'
            ? tl(T.accessDenied, locale)
            : `${tl(T.errorTitle, locale)}${result.message ? ` — ${result.message}` : ''}`,
        );
      }
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
        className="self-start rounded-md border border-border-strong text-body-sm font-medium text-primary px-md py-xs hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      >
        {tl(T.revReply, locale)}
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-sm" noValidate>
      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        required
        placeholder={tl(T.revReplyPlaceholder, locale)}
        className="rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default outline-none resize-y focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
      />
      <div className="flex items-center gap-sm">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent text-text-on-primary text-body-sm font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {pending ? tl(T.sending, locale) : tl(T.send, locale)}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="rounded-md px-md py-sm text-body-sm font-medium text-text-muted hover:text-text-default transition-colors duration-fast disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {tl(T.cancel, locale)}
        </button>
      </div>
    </form>
  );
}

'use client';

/**
 * Add-staff form (owner only). Collects a user UUID + role and calls the
 * `addStaff` Server Action (which runs add_hotel_staff). The RPC re-checks
 * owner-only.
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { type Locale } from '@dyafa/i18n';
import { T, tl } from '../../../lib/dashboard-i18n';
import { addStaff, type StaffResult } from './actions';

export function AddStaffForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'reception' | 'manager'>('reception');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    setPending(true);
    try {
      const result: StaffResult = await addStaff(userId, role);
      if (result.ok) {
        setUserId('');
        setRole('reception');
        setDone(true);
        setOpen(false);
        router.refresh();
      } else {
        setError(
          result.code === 'forbidden'
            ? tl(T.stfOwnerOnly, locale)
            : result.code === 'not_authorized'
              ? tl(T.accessDenied, locale)
              : result.code === 'invalid_input'
                ? tl(T.stfUserIdHint, locale)
                : `${tl(T.errorTitle, locale)}${result.message ? ` — ${result.message}` : ''}`,
        );
      }
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-sm">
        {done && (
          <span role="status" className="text-body-sm text-success">
            {tl(T.stfAdded, locale)}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
            setDone(false);
          }}
          className="self-start rounded-md bg-accent text-text-on-primary text-body-sm font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {tl(T.stfAdd, locale)}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-md"
      noValidate
    >
      <h3 className="font-display text-heading-3 font-semibold text-primary">
        {tl(T.stfAddTitle, locale)}
      </h3>

      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}

      <label className="flex flex-col gap-xs">
        <span className="text-caption font-semibold text-text-default">{tl(T.stfUserId, locale)}</span>
        <input
          type="text"
          required
          dir="ltr"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          className="rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default font-mono outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        />
        <span className="text-caption text-text-muted">{tl(T.stfUserIdHint, locale)}</span>
      </label>

      <label className="flex flex-col gap-xs">
        <span className="text-caption font-semibold text-text-default">{tl(T.stfRole, locale)}</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value === 'manager' ? 'manager' : 'reception')}
          className="rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          <option value="reception">{tl(T.roleReception, locale)}</option>
          <option value="manager">{tl(T.roleManager, locale)}</option>
        </select>
      </label>

      <div className="flex items-center gap-sm">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent text-text-on-primary text-body-sm font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {pending ? tl(T.saving, locale) : tl(T.stfAdd, locale)}
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

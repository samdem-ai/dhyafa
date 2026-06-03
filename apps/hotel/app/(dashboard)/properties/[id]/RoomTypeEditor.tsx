'use client';

/**
 * Inline editor for a single room type's price/inventory (manager/owner only).
 *
 * Presentational + form state; the `updateRoomType` Server Action re-verifies
 * authorization and capability server-side before writing via the user-token
 * client (RLS-scoped).
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { T, tl } from '../../../../lib/dashboard-i18n';
import { updateRoomType, type ActionResult } from '../actions';

export interface RoomTypeEditorProps {
  locale: Locale;
  canEdit: boolean;
  roomType: {
    id: string;
    propertyId: string;
    name: string;
    basePriceDzd: number;
    weekendPriceDzd: number | null;
    inventoryCount: number;
    maxOccupancy: number;
    cleaningFeeDzd: number;
    beds: string | null;
  };
}

function errorMessage(result: Extract<ActionResult, { ok: false }>, locale: Locale): string {
  switch (result.code) {
    case 'forbidden':
      return tl(T.readOnlyNotice, locale);
    case 'not_authorized':
      return tl(T.accessDenied, locale);
    case 'invalid_input':
      return tl(T.errorBody, locale);
    default:
      return `${tl(T.errorTitle, locale)}${result.message ? ` — ${result.message}` : ''}`;
  }
}

export function RoomTypeEditor({ locale, canEdit, roomType }: RoomTypeEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [base, setBase] = useState(String(roomType.basePriceDzd));
  const [weekend, setWeekend] = useState(
    roomType.weekendPriceDzd != null ? String(roomType.weekendPriceDzd) : '',
  );
  const [inventory, setInventory] = useState(String(roomType.inventoryCount));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await updateRoomType({
        roomTypeId: roomType.id,
        propertyId: roomType.propertyId,
        basePriceDzd: Number(base),
        weekendPriceDzd: weekend.trim() === '' ? null : Number(weekend),
        inventoryCount: Number(inventory),
      });
      if (result.ok) {
        setEditing(false);
        setSavedAt(Date.now());
        router.refresh();
      } else {
        setError(errorMessage(result, locale));
        if (result.code === 'not_authorized') {
          router.replace('/sign-in?next=/properties');
        }
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-card bg-surface shadow-card p-lg flex flex-col gap-md">
      <div className="flex items-start justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <span className="text-title font-semibold text-text-default">{roomType.name}</span>
          <span className="text-body-sm text-text-muted">
            {roomType.maxOccupancy} {tl(T.propGuests, locale)}
            {roomType.beds ? ` · ${roomType.beds}` : ''}
          </span>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setError(null);
            }}
            className="rounded-md border border-border-strong text-body-sm font-medium text-primary px-md py-xs hover:bg-bone-300 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
          >
            {tl(T.edit, locale)}
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}

      {!editing ? (
        <dl className="grid grid-cols-2 gap-x-lg gap-y-sm sm:grid-cols-4">
          <div className="flex flex-col gap-xs">
            <dt className="text-caption text-text-muted">{tl(T.propBasePrice, locale)}</dt>
            <dd className="text-body font-semibold text-accent">
              <bdi className="tabular-nums">{formatDZD(roomType.basePriceDzd, locale)}</bdi>
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-caption text-text-muted">{tl(T.propWeekendPrice, locale)}</dt>
            <dd className="text-body font-semibold text-text-default">
              {roomType.weekendPriceDzd != null ? (
                <bdi className="tabular-nums">{formatDZD(roomType.weekendPriceDzd, locale)}</bdi>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-caption text-text-muted">{tl(T.propInventory, locale)}</dt>
            <dd className="text-body font-semibold text-text-default tabular-nums">
              {roomType.inventoryCount}
            </dd>
          </div>
          <div className="flex flex-col gap-xs">
            <dt className="text-caption text-text-muted">{tl(T.propCleaningFee, locale)}</dt>
            <dd className="text-body font-semibold text-text-default">
              <bdi className="tabular-nums">{formatDZD(roomType.cleaningFeeDzd, locale)}</bdi>
            </dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-md" noValidate>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <label className="flex flex-col gap-xs">
              <span className="text-caption font-semibold text-text-default">
                {tl(T.propBasePrice, locale)}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                dir="ltr"
                value={base}
                onChange={(ev) => setBase(ev.target.value)}
                className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              />
            </label>
            <label className="flex flex-col gap-xs">
              <span className="text-caption font-semibold text-text-default">
                {tl(T.propWeekendPrice, locale)}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                dir="ltr"
                value={weekend}
                onChange={(ev) => setWeekend(ev.target.value)}
                className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              />
            </label>
            <label className="flex flex-col gap-xs">
              <span className="text-caption font-semibold text-text-default">
                {tl(T.propInventory, locale)}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                required
                dir="ltr"
                value={inventory}
                onChange={(ev) => setInventory(ev.target.value)}
                className="rounded-md border border-border-strong bg-surface px-md py-sm text-body text-text-default tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
              />
            </label>
          </div>
          <div className="flex items-center gap-sm">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent text-text-on-primary text-body font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              {pending ? tl(T.saving, locale) : tl(T.save, locale)}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                setBase(String(roomType.basePriceDzd));
                setWeekend(roomType.weekendPriceDzd != null ? String(roomType.weekendPriceDzd) : '');
                setInventory(String(roomType.inventoryCount));
              }}
              disabled={pending}
              className="rounded-md px-lg py-sm text-body font-medium text-text-muted hover:text-text-default transition-colors duration-fast disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
            >
              {tl(T.cancel, locale)}
            </button>
          </div>
        </form>
      )}

      {savedAt && !editing && (
        <span role="status" className="text-caption text-success">
          {tl(T.saved, locale)}
        </span>
      )}

      <a
        href={`/calendar?room=${roomType.id}`}
        className="text-body-sm font-medium text-accent hover:text-accent-hover transition-colors duration-fast"
      >
        {tl(T.propManageCalendar, locale)} →
      </a>
    </div>
  );
}

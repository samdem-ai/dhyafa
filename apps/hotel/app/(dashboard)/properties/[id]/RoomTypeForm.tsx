'use client';

/**
 * "Add room type" form (manager/owner only).
 *
 * A collapsed affordance that reveals an inline form. On submit it calls the
 * `createRoomType` Server Action, which re-verifies authorization + ownership and
 * inserts via the RLS-scoped user-token client. Mirrors the design of the inline
 * RoomTypeEditor (rebuilt primitives, logical spacing, RTL-safe numeric inputs).
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { type Locale } from '@dyafa/i18n';
import { T, tl } from '../../../../lib/dashboard-i18n';
import { buttonClass, inputClass } from '../../../../components/ui';
import { createRoomType, type ActionResult } from '../actions';

export interface RoomTypeFormProps {
  locale: Locale;
  propertyId: string;
}

function errorMessage(result: Extract<ActionResult, { ok: false }>, locale: Locale): string {
  switch (result.code) {
    case 'forbidden':
      return tl(T.readOnlyNotice, locale);
    case 'not_authorized':
      return tl(T.accessDenied, locale);
    case 'invalid_input':
      return tl(T.errorBody, locale);
    case 'not_found':
      return tl(T.errorBody, locale);
    default:
      return `${tl(T.errorTitle, locale)}${result.message ? ` — ${result.message}` : ''}`;
  }
}

const FIELD_LABEL = 'text-caption font-semibold text-text-default';
const NUMERIC_INPUT = `${inputClass} tabular-nums`;

export function RoomTypeForm({ locale, propertyId }: RoomTypeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [maxOccupancy, setMaxOccupancy] = useState('2');
  const [baseOccupancy, setBaseOccupancy] = useState('2');
  const [base, setBase] = useState('');
  const [weekend, setWeekend] = useState('');
  const [cleaning, setCleaning] = useState('0');
  const [inventory, setInventory] = useState('1');

  function reset() {
    setName('');
    setMaxOccupancy('2');
    setBaseOccupancy('2');
    setBase('');
    setWeekend('');
    setCleaning('0');
    setInventory('1');
    setError(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError(tl(T.propRoomTypeNameRequired, locale));
      return;
    }

    setPending(true);
    try {
      const result = await createRoomType({
        propertyId,
        name: name.trim(),
        maxOccupancy: Number(maxOccupancy),
        baseOccupancy: Number(baseOccupancy),
        basePriceDzd: Number(base),
        weekendPriceDzd: weekend.trim() === '' ? null : Number(weekend),
        cleaningFeeDzd: cleaning.trim() === '' ? 0 : Number(cleaning),
        inventoryCount: Number(inventory),
      });
      if (result.ok) {
        reset();
        setOpen(false);
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

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass('secondary', 'sm')}>
        + {tl(T.propAddRoomType, locale)}
      </button>
    );
  }

  return (
    <div className="card-surface p-lg sm:p-xl flex flex-col gap-md">
      <div className="flex items-center justify-between gap-md">
        <h3 className="font-display text-heading-3 font-semibold text-primary">
          {tl(T.propAddRoomTypeTitle, locale)}
        </h3>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-md" noValidate>
        <label className="flex flex-col gap-xs">
          <span className={FIELD_LABEL}>{tl(T.propRoomTypeName, locale)}</span>
          <input
            type="text"
            required
            maxLength={120}
            value={name}
            placeholder={tl(T.propRoomTypeNamePh, locale)}
            onChange={(ev) => setName(ev.target.value)}
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
          <label className="flex flex-col gap-xs">
            <span className={FIELD_LABEL}>{tl(T.propMaxOccupancy, locale)}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              dir="ltr"
              value={maxOccupancy}
              onChange={(ev) => setMaxOccupancy(ev.target.value)}
              className={NUMERIC_INPUT}
            />
          </label>
          <label className="flex flex-col gap-xs">
            <span className={FIELD_LABEL}>{tl(T.propBaseOccupancy, locale)}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              dir="ltr"
              value={baseOccupancy}
              onChange={(ev) => setBaseOccupancy(ev.target.value)}
              className={NUMERIC_INPUT}
            />
          </label>
          <label className="flex flex-col gap-xs">
            <span className={FIELD_LABEL}>{tl(T.propInventory, locale)}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              dir="ltr"
              value={inventory}
              onChange={(ev) => setInventory(ev.target.value)}
              className={NUMERIC_INPUT}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
          <label className="flex flex-col gap-xs">
            <span className={FIELD_LABEL}>{tl(T.propBasePrice, locale)}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              dir="ltr"
              value={base}
              onChange={(ev) => setBase(ev.target.value)}
              className={NUMERIC_INPUT}
            />
          </label>
          <label className="flex flex-col gap-xs">
            <span className={FIELD_LABEL}>{tl(T.propWeekendPrice, locale)}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              dir="ltr"
              value={weekend}
              onChange={(ev) => setWeekend(ev.target.value)}
              className={NUMERIC_INPUT}
            />
          </label>
          <label className="flex flex-col gap-xs">
            <span className={FIELD_LABEL}>{tl(T.propCleaningFee, locale)}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              dir="ltr"
              value={cleaning}
              onChange={(ev) => setCleaning(ev.target.value)}
              className={NUMERIC_INPUT}
            />
          </label>
        </div>

        <div className="flex items-center gap-sm">
          <button type="submit" disabled={pending} className={buttonClass('accent', 'md')}>
            {pending ? tl(T.propCreating, locale) : tl(T.propCreate, locale)}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(false);
            }}
            disabled={pending}
            className={buttonClass('ghost', 'md')}
          >
            {tl(T.cancel, locale)}
          </button>
        </div>
      </form>
    </div>
  );
}

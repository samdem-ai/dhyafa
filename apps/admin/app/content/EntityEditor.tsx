'use client';

/**
 * Reusable create/edit form for the CMS entities. One component, five `kind`s:
 * collection | banner | rail | property_type | amenity. Each renders the right
 * fields (localized ar/fr/en + scalars) and dispatches to the matching Server
 * Action. Used both as an inline "new" form and an expandable per-row editor.
 *
 * Server Actions re-verify admin authz server-side; this is form state + a thin
 * dispatch only. Rails are edit-only (no create — keys/kinds are app-defined).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveCollection,
  saveBanner,
  saveRail,
  savePropertyType,
  saveAmenity,
  type ContentResult,
  type L10nInput,
} from './actions';
import { C, tl } from '../../lib/admin-i18n';
import type { Locale } from '@dyafa/i18n';

export type EditorKind = 'collection' | 'banner' | 'rail' | 'property_type' | 'amenity';

export interface EditorInitial {
  id?: string | number;
  slug?: string;
  titleAr?: string | null;
  titleFr?: string | null;
  titleEn?: string | null;
  subAr?: string | null;
  subFr?: string | null;
  subEn?: string | null;
  bodyAr?: string | null;
  bodyFr?: string | null;
  bodyEn?: string | null;
  imagePath?: string | null;
  targetUrl?: string | null;
  icon?: string | null;
  category?: string | null;
  kindEnum?: 'single_unit' | 'multi_room';
  sortOrder?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

const L = {
  slug: { ar: 'المعرّف (slug)', fr: 'Slug', en: 'Slug' },
  title: { ar: 'العنوان', fr: 'Titre', en: 'Title' },
  subtitle: { ar: 'العنوان الفرعي', fr: 'Sous-titre', en: 'Subtitle' },
  body: { ar: 'النص', fr: 'Texte', en: 'Body' },
  name: { ar: 'الاسم', fr: 'Nom', en: 'Name' },
  image: { ar: 'مسار الصورة', fr: 'Chemin image', en: 'Image path' },
  target: { ar: 'رابط الوجهة', fr: 'URL cible', en: 'Target URL' },
  icon: { ar: 'الأيقونة', fr: 'Icône', en: 'Icon' },
  category: { ar: 'الفئة', fr: 'Catégorie', en: 'Category' },
  kind: { ar: 'النوع', fr: 'Type', en: 'Kind' },
  sort: { ar: 'الترتيب', fr: 'Ordre', en: 'Sort order' },
  starts: { ar: 'يبدأ في', fr: 'Début', en: 'Starts' },
  ends: { ar: 'ينتهي في', fr: 'Fin', en: 'Ends' },
  active: { ar: 'نشط', fr: 'Actif', en: 'Actif' },
  ar: { ar: 'عربي', fr: 'Arabe', en: 'Arabic' },
  fr: { ar: 'فرنسي', fr: 'Français', en: 'French' },
  en: { ar: 'إنجليزي', fr: 'Anglais', en: 'English' },
  saved: { ar: 'تم الحفظ', fr: 'Enregistré', en: 'Saved' },
} as const;

function errText(r: Extract<ContentResult, { ok: false }>, locale: Locale): string {
  if (r.code === 'not_authorized') return tl(C.notAuthorized, locale);
  if (r.code === 'invalid_input') return tl(C.reasonRequired, locale);
  return `${tl(C.actionFailed, locale)}${r.message ? ` — ${r.message}` : ''}`;
}

const input =
  'rounded-md border border-border-strong bg-surface px-md py-sm text-body-sm text-text-default outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2';

function TripleLocale({
  locale,
  label,
  ar,
  fr,
  en,
  set,
}: {
  locale: Locale;
  label: string;
  ar: string;
  fr: string;
  en: string;
  set: (which: 'ar' | 'fr' | 'en', v: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-xs">
      <legend className="text-caption font-semibold text-text-default">{label}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-xs">
        <input dir="rtl" placeholder={tl(L.ar, locale)} value={ar} onChange={(e) => set('ar', e.target.value)} className={input} />
        <input dir="ltr" placeholder={tl(L.fr, locale)} value={fr} onChange={(e) => set('fr', e.target.value)} className={input} />
        <input dir="ltr" placeholder={tl(L.en, locale)} value={en} onChange={(e) => set('en', e.target.value)} className={input} />
      </div>
    </fieldset>
  );
}

export function EntityEditor({
  kind,
  locale,
  initial,
  onSaved,
}: {
  kind: EditorKind;
  locale: Locale;
  initial?: EditorInitial;
  /** Called after a successful save (e.g. to collapse a row editor). */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const i = initial ?? {};

  const [slug, setSlug] = useState(i.slug ?? '');
  const [title, setTitle] = useState<L10nInput>({ ar: i.titleAr ?? '', fr: i.titleFr ?? '', en: i.titleEn ?? '' });
  const [subtitle, setSubtitle] = useState<L10nInput>({ ar: i.subAr ?? '', fr: i.subFr ?? '', en: i.subEn ?? '' });
  const [body, setBody] = useState<L10nInput>({ ar: i.bodyAr ?? '', fr: i.bodyFr ?? '', en: i.bodyEn ?? '' });
  const [name, setName] = useState<L10nInput>({ ar: i.titleAr ?? '', fr: i.titleFr ?? '', en: i.titleEn ?? '' });
  const [imagePath, setImagePath] = useState(i.imagePath ?? '');
  const [targetUrl, setTargetUrl] = useState(i.targetUrl ?? '');
  const [icon, setIcon] = useState(i.icon ?? '');
  const [category, setCategory] = useState(i.category ?? '');
  const [kindEnum, setKindEnum] = useState<'single_unit' | 'multi_room'>(i.kindEnum ?? 'single_unit');
  const [sortOrder, setSortOrder] = useState(String(i.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(i.isActive ?? true);
  const [startsAt, setStartsAt] = useState(i.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(i.endsAt ?? '');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);

  const upd = (setter: (v: L10nInput) => void, cur: L10nInput) => (which: 'ar' | 'fr' | 'en', v: string) =>
    setter({ ...cur, [which]: v });

  async function dispatch(): Promise<ContentResult> {
    const sort = Number(sortOrder);
    switch (kind) {
      case 'collection':
        return saveCollection({
          id: typeof i.id === 'string' ? i.id : undefined,
          slug,
          title,
          subtitle,
          sortOrder: sort,
          isActive,
        });
      case 'banner':
        return saveBanner({
          id: typeof i.id === 'string' ? i.id : undefined,
          imagePath,
          title,
          body,
          targetUrl: targetUrl || null,
          sortOrder: sort,
          isActive,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        });
      case 'rail':
        return saveRail({ id: String(i.id ?? ''), title, sortOrder: sort, isActive });
      case 'property_type':
        return savePropertyType({
          id: typeof i.id === 'number' ? i.id : undefined,
          slug,
          kind: kindEnum,
          name,
          icon: icon || null,
          sortOrder: sort,
        });
      case 'amenity':
        return saveAmenity({
          id: typeof i.id === 'number' ? i.id : undefined,
          slug,
          name,
          icon: icon || null,
          category: category || null,
        });
    }
  }

  async function onSubmit() {
    setError(null);
    setOkMsg(false);
    setPending(true);
    try {
      const r = await dispatch();
      if (r.ok) {
        setOkMsg(true);
        router.refresh();
        onSaved?.();
      } else {
        setError(errText(r, locale));
        if (r.code === 'not_authorized') router.replace('/sign-in?next=%2Fcontent');
      }
    } finally {
      setPending(false);
    }
  }

  const showSlug = kind !== 'rail';
  const showTitle = kind === 'collection' || kind === 'banner' || kind === 'rail';
  const showName = kind === 'property_type' || kind === 'amenity';
  const showSubtitle = kind === 'collection';
  const showBody = kind === 'banner';
  const showImage = kind === 'banner';
  const showTarget = kind === 'banner';
  const showIcon = kind === 'property_type' || kind === 'amenity';
  const showCategory = kind === 'amenity';
  const showKindEnum = kind === 'property_type';
  const showSchedule = kind === 'banner';
  const showActive = kind !== 'property_type' && kind !== 'amenity';

  return (
    <div className="flex flex-col gap-md">
      {error && (
        <div role="alert" className="rounded-md bg-error-bg text-error text-body-sm px-md py-sm">
          {error}
        </div>
      )}
      {okMsg && (
        <div role="status" className="rounded-md bg-success-bg text-success text-body-sm px-md py-sm">
          {tl(L.saved, locale)}
        </div>
      )}

      {showSlug && (
        <label className="flex flex-col gap-xs">
          <span className="text-caption font-semibold text-text-default">{tl(L.slug, locale)}</span>
          <input dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value)} className={input} />
        </label>
      )}

      {showTitle && (
        <TripleLocale
          locale={locale}
          label={tl(L.title, locale)}
          ar={title.ar ?? ''}
          fr={title.fr ?? ''}
          en={title.en ?? ''}
          set={upd(setTitle, title)}
        />
      )}
      {showName && (
        <TripleLocale
          locale={locale}
          label={tl(L.name, locale)}
          ar={name.ar ?? ''}
          fr={name.fr ?? ''}
          en={name.en ?? ''}
          set={upd(setName, name)}
        />
      )}
      {showSubtitle && (
        <TripleLocale
          locale={locale}
          label={tl(L.subtitle, locale)}
          ar={subtitle.ar ?? ''}
          fr={subtitle.fr ?? ''}
          en={subtitle.en ?? ''}
          set={upd(setSubtitle, subtitle)}
        />
      )}
      {showBody && (
        <TripleLocale
          locale={locale}
          label={tl(L.body, locale)}
          ar={body.ar ?? ''}
          fr={body.fr ?? ''}
          en={body.en ?? ''}
          set={upd(setBody, body)}
        />
      )}

      {showImage && (
        <label className="flex flex-col gap-xs">
          <span className="text-caption font-semibold text-text-default">{tl(L.image, locale)}</span>
          <input dir="ltr" value={imagePath} onChange={(e) => setImagePath(e.target.value)} className={input} />
        </label>
      )}
      {showTarget && (
        <label className="flex flex-col gap-xs">
          <span className="text-caption font-semibold text-text-default">{tl(L.target, locale)}</span>
          <input dir="ltr" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className={input} />
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
        {showKindEnum && (
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">{tl(L.kind, locale)}</span>
            <select value={kindEnum} onChange={(e) => setKindEnum(e.target.value as 'single_unit' | 'multi_room')} className={input}>
              <option value="single_unit">single_unit</option>
              <option value="multi_room">multi_room</option>
            </select>
          </label>
        )}
        {showIcon && (
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">{tl(L.icon, locale)}</span>
            <input dir="ltr" value={icon} onChange={(e) => setIcon(e.target.value)} className={input} />
          </label>
        )}
        {showCategory && (
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">{tl(L.category, locale)}</span>
            <input dir="ltr" value={category} onChange={(e) => setCategory(e.target.value)} className={input} />
          </label>
        )}
        {kind !== 'amenity' && (
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">{tl(L.sort, locale)}</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={input}
            />
          </label>
        )}
      </div>

      {showSchedule && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">{tl(L.starts, locale)}</span>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-xs">
            <span className="text-caption font-semibold text-text-default">{tl(L.ends, locale)}</span>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={input} />
          </label>
        </div>
      )}

      {showActive && (
        <label className="inline-flex items-center gap-sm text-body-sm text-text-default">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {tl(L.active, locale)}
        </label>
      )}

      <div>
        <button
          type="button"
          disabled={pending}
          onClick={onSubmit}
          className="rounded-md bg-accent text-text-on-primary text-body-sm font-semibold px-lg py-sm transition-opacity duration-fast hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          {pending ? tl(C.submitting, locale) : tl(C.save, locale)}
        </button>
      </div>
    </div>
  );
}

/**
 * Shared AR / FR / EN copy + formatting helpers for the M6 admin dashboard.
 *
 * Mirrors the inline-object localization style in `lib/moderation-i18n.ts`
 * (the i18next bundles don't yet carry an `admin` namespace). Arabic is the
 * default/primary locale. Keep this the single source for cross-page strings —
 * page-specific copy can stay inline in each page.
 */

import type { Locale } from '@dyafa/i18n';

/** A string available in all three locales. */
export type L10n = Record<Locale, string>;

/** Pick the active-locale string from an inline {ar,fr,en} object. */
export function tl(obj: L10n, locale: Locale): string {
  return obj[locale];
}

/**
 * Resolve a localized DB field with the ar → fr → en fallback chain.
 * (Same semantics as moderation-i18n.localizedField; duplicated here so admin
 * pages don't reach across feature folders.)
 */
export function localized(
  row: { ar?: string | null; fr?: string | null; en?: string | null },
  locale: Locale,
): string | null {
  const order: Locale[] =
    locale === 'ar' ? ['ar', 'fr', 'en'] : locale === 'fr' ? ['fr', 'ar', 'en'] : ['en', 'fr', 'ar'];
  for (const l of order) {
    const v = row[l];
    if (v && v.trim().length > 0) return v;
  }
  return null;
}

// ─── Date / number formatting (Latin digits everywhere, per docs/07 §6) ──────

const bcp47 = (locale: Locale): string =>
  locale === 'ar' ? 'ar-DZ-u-nu-latn' : `${locale}-u-nu-latn`;

/** Format an ISO timestamp as date + time. */
export function formatDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(bcp47(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Format an ISO date (no time). */
export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(bcp47(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/** Format an integer count with locale grouping + Latin digits. */
export function formatInt(value: number | null | undefined, locale: Locale): string {
  const n = value ?? 0;
  return new Intl.NumberFormat(bcp47(locale), { maximumFractionDigits: 0 }).format(n);
}

/** Format a 0–100 percentage with one decimal + locale digits. */
export function formatPct(value: number | null | undefined, locale: Locale): string {
  const n = value ?? 0;
  return `${new Intl.NumberFormat(bcp47(locale), {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(n)}%`;
}

// ─── Brand / shell chrome ────────────────────────────────────────────────────

export const C = {
  brand: { ar: 'دافة', fr: 'Dyafa', en: 'Dyafa' },
  adminLabel: { ar: 'لوحة التحكم', fr: 'Administration', en: 'Admin' },
  backToDashboard: { ar: '← لوحة التحكم', fr: '← Tableau de bord', en: '← Dashboard' },
  signOut: { ar: 'تسجيل الخروج', fr: 'Déconnexion', en: 'Sign out' },

  // Generic states
  errorTitle: { ar: 'تعذّر تحميل البيانات', fr: 'Échec du chargement', en: 'Failed to load' },
  actionFailed: { ar: 'تعذّر إكمال العملية', fr: 'Échec de l’opération', en: 'Action failed' },
  loading: { ar: 'جارٍ التحميل…', fr: 'Chargement…', en: 'Loading…' },
  submitting: { ar: 'جارٍ الحفظ…', fr: 'Enregistrement…', en: 'Saving…' },
  emptyTitle: { ar: 'لا توجد نتائج', fr: 'Aucun résultat', en: 'No results' },
  emptyBody: {
    ar: 'لا توجد بيانات مطابقة للمرشّحات الحالية.',
    fr: 'Aucune donnée ne correspond aux filtres actuels.',
    en: 'Nothing matches the current filters.',
  },
  notAuthorized: {
    ar: 'انتهت الجلسة أو لا تملك صلاحية. يرجى تسجيل الدخول من جديد.',
    fr: 'Session expirée ou non autorisée. Veuillez vous reconnecter.',
    en: 'Session expired or not authorized. Please sign in again.',
  },
  cancel: { ar: 'إلغاء', fr: 'Annuler', en: 'Cancel' },
  confirm: { ar: 'تأكيد', fr: 'Confirmer', en: 'Confirm' },
  save: { ar: 'حفظ', fr: 'Enregistrer', en: 'Save' },
  search: { ar: 'بحث', fr: 'Rechercher', en: 'Search' },
  filters: { ar: 'المرشّحات', fr: 'Filtres', en: 'Filters' },
  apply: { ar: 'تطبيق', fr: 'Appliquer', en: 'Apply' },
  reset: { ar: 'إعادة ضبط', fr: 'Réinitialiser', en: 'Reset' },
  all: { ar: 'الكل', fr: 'Tous', en: 'All' },
  reason: { ar: 'السبب', fr: 'Motif', en: 'Reason' },
  reasonRequired: {
    ar: 'يجب إدخال سبب.',
    fr: 'Un motif est requis.',
    en: 'A reason is required.',
  },
  details: { ar: 'التفاصيل', fr: 'Détails', en: 'Details' },
  back: { ar: '← رجوع', fr: '← Retour', en: '← Back' },
  yes: { ar: 'نعم', fr: 'Oui', en: 'Yes' },
  no: { ar: 'لا', fr: 'Non', en: 'No' },
  done: { ar: 'تم بنجاح', fr: 'Effectué', en: 'Done' },
  status: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  date: { ar: 'التاريخ', fr: 'Date', en: 'Date' },
  amount: { ar: 'المبلغ', fr: 'Montant', en: 'Amount' },
  guest: { ar: 'الضيف', fr: 'Voyageur', en: 'Guest' },
  host: { ar: 'المضيف', fr: 'Hôte', en: 'Host' },
} satisfies Record<string, L10n>;

// ─── Navigation (shared admin shell) ─────────────────────────────────────────

export interface NavItem {
  href: string;
  label: L10n;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: { ar: 'نظرة عامة', fr: 'Vue d’ensemble', en: 'Overview' } },
  { href: '/users', label: { ar: 'المستخدمون', fr: 'Utilisateurs', en: 'Users' } },
  { href: '/moderation', label: { ar: 'الإعلانات', fr: 'Annonces', en: 'Listings' } },
  { href: '/bookings', label: { ar: 'الحجوزات', fr: 'Réservations', en: 'Bookings' } },
  { href: '/payments', label: { ar: 'المدفوعات', fr: 'Paiements', en: 'Payments' } },
  { href: '/reviews', label: { ar: 'التقييمات', fr: 'Avis', en: 'Reviews' } },
  { href: '/disputes', label: { ar: 'النزاعات', fr: 'Litiges', en: 'Disputes' } },
  { href: '/content', label: { ar: 'المحتوى', fr: 'Contenu', en: 'Content' } },
  { href: '/audit', label: { ar: 'سجل التدقيق', fr: 'Journal d’audit', en: 'Audit' } },
] as const;

// ─── Status enum → localized labels ──────────────────────────────────────────

/** Visual tone for a status pill. */
export type Tone = 'neutral' | 'success' | 'warning' | 'error' | 'info';

export const STATUS_PILL: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-text-muted',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  error: 'bg-error-bg text-error',
  info: 'bg-info-bg text-info',
};

export const BOOKING_STATUS: Record<string, { label: L10n; tone: Tone }> = {
  requested: { label: { ar: 'مطلوب', fr: 'Demandé', en: 'Requested' }, tone: 'info' },
  declined: { label: { ar: 'مرفوض', fr: 'Refusé', en: 'Declined' }, tone: 'neutral' },
  awaiting_payment: {
    label: { ar: 'بانتظار الدفع', fr: 'En attente de paiement', en: 'Awaiting payment' },
    tone: 'warning',
  },
  confirmed: { label: { ar: 'مؤكَّد', fr: 'Confirmé', en: 'Confirmed' }, tone: 'success' },
  checked_in: { label: { ar: 'تم الوصول', fr: 'Arrivé', en: 'Checked in' }, tone: 'success' },
  completed: { label: { ar: 'مكتمل', fr: 'Terminé', en: 'Completed' }, tone: 'success' },
  cancelled: { label: { ar: 'ملغى', fr: 'Annulé', en: 'Cancelled' }, tone: 'error' },
  no_show: { label: { ar: 'لم يحضر', fr: 'Non présenté', en: 'No-show' }, tone: 'error' },
  expired: { label: { ar: 'منتهٍ', fr: 'Expiré', en: 'Expired' }, tone: 'neutral' },
};

export const TXN_STATUS: Record<string, { label: L10n; tone: Tone }> = {
  pending: { label: { ar: 'معلّق', fr: 'En attente', en: 'Pending' }, tone: 'warning' },
  processing: { label: { ar: 'قيد المعالجة', fr: 'En cours', en: 'Processing' }, tone: 'info' },
  paid: { label: { ar: 'مدفوع', fr: 'Payé', en: 'Paid' }, tone: 'success' },
  failed: { label: { ar: 'فشل', fr: 'Échoué', en: 'Failed' }, tone: 'error' },
  refunded: { label: { ar: 'مُسترَد', fr: 'Remboursé', en: 'Refunded' }, tone: 'neutral' },
  partially_refunded: {
    label: { ar: 'مُسترَد جزئيًا', fr: 'Remb. partiel', en: 'Partial refund' },
    tone: 'neutral',
  },
  expired: { label: { ar: 'منتهٍ', fr: 'Expiré', en: 'Expired' }, tone: 'neutral' },
};

export const PAYOUT_STATUS: Record<string, { label: L10n; tone: Tone }> = {
  pending: { label: { ar: 'معلّق', fr: 'En attente', en: 'Pending' }, tone: 'warning' },
  processing: { label: { ar: 'قيد المعالجة', fr: 'En cours', en: 'Processing' }, tone: 'info' },
  paid: { label: { ar: 'مدفوع', fr: 'Payé', en: 'Paid' }, tone: 'success' },
  failed: { label: { ar: 'فشل', fr: 'Échoué', en: 'Failed' }, tone: 'error' },
  on_hold: { label: { ar: 'موقوف', fr: 'En suspens', en: 'On hold' }, tone: 'neutral' },
};

export const DISPUTE_STATUS: Record<string, { label: L10n; tone: Tone }> = {
  open: { label: { ar: 'مفتوح', fr: 'Ouvert', en: 'Open' }, tone: 'warning' },
  under_review: { label: { ar: 'قيد المراجعة', fr: 'En examen', en: 'Under review' }, tone: 'info' },
  resolved: { label: { ar: 'محلول', fr: 'Résolu', en: 'Resolved' }, tone: 'success' },
  rejected: { label: { ar: 'مرفوض', fr: 'Rejeté', en: 'Rejected' }, tone: 'neutral' },
  cancelled: { label: { ar: 'ملغى', fr: 'Annulé', en: 'Cancelled' }, tone: 'neutral' },
};

export const DISPUTE_CATEGORY: Record<string, L10n> = {
  refund: { ar: 'استرداد', fr: 'Remboursement', en: 'Refund' },
  no_show: { ar: 'عدم حضور', fr: 'Non-présentation', en: 'No-show' },
  property_mismatch: { ar: 'عدم تطابق', fr: 'Non-conformité', en: 'Mismatch' },
  damage: { ar: 'أضرار', fr: 'Dommages', en: 'Damage' },
  payment: { ar: 'دفع', fr: 'Paiement', en: 'Payment' },
  other: { ar: 'أخرى', fr: 'Autre', en: 'Other' },
};

export const REVIEW_STATUS: Record<string, { label: L10n; tone: Tone }> = {
  pending: { label: { ar: 'معلّق', fr: 'En attente', en: 'Pending' }, tone: 'warning' },
  published: { label: { ar: 'منشور', fr: 'Publié', en: 'Published' }, tone: 'success' },
  hidden: { label: { ar: 'مُخفى', fr: 'Masqué', en: 'Hidden' }, tone: 'neutral' },
  removed: { label: { ar: 'محذوف', fr: 'Supprimé', en: 'Removed' }, tone: 'error' },
};

export const VERIFICATION_STATUS: Record<string, { label: L10n; tone: Tone }> = {
  unverified: { label: { ar: 'غير مُتحقَّق', fr: 'Non vérifié', en: 'Unverified' }, tone: 'neutral' },
  pending: { label: { ar: 'قيد التحقق', fr: 'En attente', en: 'Pending' }, tone: 'warning' },
  verified: { label: { ar: 'مُتحقَّق', fr: 'Vérifié', en: 'Verified' }, tone: 'success' },
  rejected: { label: { ar: 'مرفوض', fr: 'Rejeté', en: 'Rejected' }, tone: 'error' },
};

/** Resolve a status descriptor; falls back to the raw value with neutral tone. */
export function statusOf(
  map: Record<string, { label: L10n; tone: Tone }>,
  key: string | null | undefined,
  locale: Locale,
): { text: string; tone: Tone } {
  if (key && map[key]) return { text: map[key].label[locale], tone: map[key].tone };
  return { text: key ?? '—', tone: 'neutral' };
}

/**
 * Inline AR / FR / EN strings for the listing-moderation feature.
 *
 * Mirrors the inline-object localization style already used in app/page.tsx
 * (rather than the i18next namespaces, which don't yet carry an `admin` bundle).
 * Arabic is the default/primary locale.
 */

import type { Locale } from '@dyafa/i18n';

/** A string available in all three locales. */
export type L10n = Record<Locale, string>;

/** Pick the active-locale string from an inline {ar,fr,en} object. */
export function tl(obj: L10n, locale: Locale): string {
  return obj[locale];
}

/**
 * Resolve a localized DB field with the ar → fr → en fallback chain
 * (matches docs/07 §6). Returns the requested locale if present, otherwise the
 * first non-empty value in fallback order, otherwise `null`.
 */
export function localizedField(
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

/** rejection_reason enum → localized label (see enums migration). */
export const REJECTION_REASONS: readonly {
  value:
    | 'incomplete_info'
    | 'poor_photo_quality'
    | 'prohibited_content'
    | 'duplicate'
    | 'suspected_fraud'
    | 'policy_violation'
    | 'other';
  label: L10n;
}[] = [
  {
    value: 'incomplete_info',
    label: { ar: 'معلومات ناقصة', fr: 'Informations incomplètes', en: 'Incomplete information' },
  },
  {
    value: 'poor_photo_quality',
    label: { ar: 'جودة صور ضعيفة', fr: 'Photos de mauvaise qualité', en: 'Poor photo quality' },
  },
  {
    value: 'prohibited_content',
    label: { ar: 'محتوى محظور', fr: 'Contenu interdit', en: 'Prohibited content' },
  },
  {
    value: 'duplicate',
    label: { ar: 'إعلان مكرر', fr: 'Annonce en double', en: 'Duplicate listing' },
  },
  {
    value: 'suspected_fraud',
    label: { ar: 'اشتباه في احتيال', fr: 'Fraude suspectée', en: 'Suspected fraud' },
  },
  {
    value: 'policy_violation',
    label: { ar: 'مخالفة للسياسات', fr: 'Violation des règles', en: 'Policy violation' },
  },
  {
    value: 'other',
    label: { ar: 'سبب آخر', fr: 'Autre raison', en: 'Other reason' },
  },
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number]['value'];

const REJECTION_VALUES = REJECTION_REASONS.map((r) => r.value);

/** Runtime guard for a rejection_reason coming off a <form>. */
export function isRejectionReason(v: unknown): v is RejectionReason {
  return typeof v === 'string' && (REJECTION_VALUES as string[]).includes(v);
}

/** Shared UI copy used across the moderation pages. */
export const M = {
  brand: { ar: 'دافة', fr: 'Dyafa', en: 'Dyafa' },
  adminLabel: { ar: 'لوحة التحكم', fr: 'Administration', en: 'Admin' },
  queueTitle: { ar: 'طابور المراجعة', fr: 'File de modération', en: 'Moderation Queue' },
  queueSubtitle: {
    ar: 'الإعلانات بانتظار الموافقة',
    fr: 'Annonces en attente d’approbation',
    en: 'Listings awaiting approval',
  },
  backToQueue: { ar: '← العودة إلى الطابور', fr: '← Retour à la file', en: '← Back to queue' },
  backToDashboard: {
    ar: '← لوحة التحكم',
    fr: '← Tableau de bord',
    en: '← Dashboard',
  },
  emptyTitle: { ar: 'لا توجد إعلانات للمراجعة', fr: 'Aucune annonce à modérer', en: 'Nothing to review' },
  emptyBody: {
    ar: 'تمت مراجعة جميع الإعلانات المُرسَلة. ستظهر الإعلانات الجديدة هنا فور إرسالها.',
    fr: 'Toutes les annonces soumises ont été traitées. Les nouvelles apparaîtront ici.',
    en: 'Every submitted listing has been handled. New submissions will appear here.',
  },
  colListing: { ar: 'الإعلان', fr: 'Annonce', en: 'Listing' },
  colHost: { ar: 'المضيف', fr: 'Hôte', en: 'Host' },
  colWilaya: { ar: 'الولاية', fr: 'Wilaya', en: 'Wilaya' },
  colType: { ar: 'النوع', fr: 'Type', en: 'Type' },
  colSubmitted: { ar: 'تاريخ الإرسال', fr: 'Soumis le', en: 'Submitted' },
  colPhotos: { ar: 'الصور', fr: 'Photos', en: 'Photos' },
  pendingBadge: { ar: 'قيد المراجعة', fr: 'En attente', en: 'Pending' },
  review: { ar: 'مراجعة', fr: 'Examiner', en: 'Review' },
  untitled: { ar: 'بدون عنوان', fr: 'Sans titre', en: 'Untitled' },
  unknownHost: { ar: 'مضيف غير معروف', fr: 'Hôte inconnu', en: 'Unknown host' },
  // ── Detail page ─────────────────────────────────────────────────────────
  photos: { ar: 'الصور', fr: 'Photos', en: 'Photos' },
  noPhotos: { ar: 'لا توجد صور', fr: 'Aucune photo', en: 'No photos' },
  titlesSection: { ar: 'العناوين', fr: 'Titres', en: 'Titles' },
  descriptionsSection: { ar: 'الأوصاف', fr: 'Descriptions', en: 'Descriptions' },
  roomTypes: { ar: 'أنواع الغرف', fr: 'Types de chambres', en: 'Room types' },
  amenities: { ar: 'المرافق', fr: 'Équipements', en: 'Amenities' },
  houseRules: { ar: 'قواعد المنزل', fr: 'Règlement intérieur', en: 'House rules' },
  hostInfo: { ar: 'معلومات المضيف', fr: 'Informations sur l’hôte', en: 'Host info' },
  location: { ar: 'الموقع', fr: 'Emplacement', en: 'Location' },
  perNight: { ar: '/ ليلة', fr: '/ nuit', en: '/ night' },
  weekend: { ar: 'عطلة نهاية الأسبوع', fr: 'Week-end', en: 'Weekend' },
  cleaningFee: { ar: 'رسوم التنظيف', fr: 'Frais de ménage', en: 'Cleaning fee' },
  maxOccupancy: { ar: 'السعة القصوى', fr: 'Capacité max.', en: 'Max occupancy' },
  inventory: { ar: 'عدد الوحدات', fr: 'Unités', en: 'Units' },
  guests: { ar: 'ضيوف', fr: 'invités', en: 'guests' },
  checkin: { ar: 'تسجيل الدخول', fr: 'Arrivée', en: 'Check-in' },
  checkout: { ar: 'تسجيل الخروج', fr: 'Départ', en: 'Check-out' },
  identityStatus: { ar: 'حالة التحقق', fr: 'Vérification', en: 'Identity' },
  langAr: { ar: 'العربية', fr: 'Arabe', en: 'Arabic' },
  langFr: { ar: 'الفرنسية', fr: 'Français', en: 'French' },
  langEn: { ar: 'الإنجليزية', fr: 'Anglais', en: 'English' },
  notProvided: { ar: '— غير متوفر', fr: '— non renseigné', en: '— not provided' },
  noAmenities: { ar: 'لم تُحدَّد مرافق', fr: 'Aucun équipement', en: 'No amenities listed' },
  noRoomTypes: { ar: 'لا توجد غرف', fr: 'Aucune chambre', en: 'No room types' },
  submittedAt: { ar: 'أُرسِل في', fr: 'Soumis le', en: 'Submitted' },
  instantBook: { ar: 'حجز فوري', fr: 'Réservation instantanée', en: 'Instant book' },
  cancellation: { ar: 'سياسة الإلغاء', fr: 'Politique d’annulation', en: 'Cancellation policy' },
  // ── Actions ─────────────────────────────────────────────────────────────
  decision: { ar: 'القرار', fr: 'Décision', en: 'Decision' },
  approve: { ar: 'الموافقة', fr: 'Approuver', en: 'Approve' },
  approveHint: {
    ar: 'سيصبح الإعلان مرئيًا للضيوف فورًا.',
    fr: 'L’annonce deviendra visible par les voyageurs.',
    en: 'The listing becomes visible to guests immediately.',
  },
  reject: { ar: 'الرفض', fr: 'Rejeter', en: 'Reject' },
  rejectReasonLabel: { ar: 'سبب الرفض', fr: 'Motif du rejet', en: 'Rejection reason' },
  rejectNoteLabel: {
    ar: 'ملاحظة للمضيف (اختياري)',
    fr: 'Note pour l’hôte (facultatif)',
    en: 'Note to host (optional)',
  },
  rejectNotePlaceholder: {
    ar: 'وضّح ما يجب تصحيحه…',
    fr: 'Précisez ce qui doit être corrigé…',
    en: 'Explain what needs to be fixed…',
  },
  chooseReason: { ar: 'اختر سببًا…', fr: 'Choisir un motif…', en: 'Choose a reason…' },
  submitting: { ar: 'جارٍ الحفظ…', fr: 'Enregistrement…', en: 'Saving…' },
  approved: { ar: 'تمت الموافقة على الإعلان', fr: 'Annonce approuvée', en: 'Listing approved' },
  rejected: { ar: 'تم رفض الإعلان', fr: 'Annonce rejetée', en: 'Listing rejected' },
  errorTitle: { ar: 'تعذّر إكمال العملية', fr: 'Échec de l’opération', en: 'Action failed' },
  errorNotAuthorized: {
    ar: 'انتهت الجلسة أو لا تملك صلاحية. يرجى تسجيل الدخول من جديد.',
    fr: 'Session expirée ou non autorisée. Veuillez vous reconnecter.',
    en: 'Session expired or not authorized. Please sign in again.',
  },
  errorReasonRequired: {
    ar: 'يجب اختيار سبب للرفض.',
    fr: 'Un motif de rejet est requis.',
    en: 'A rejection reason is required.',
  },
  notFoundTitle: { ar: 'الإعلان غير موجود', fr: 'Annonce introuvable', en: 'Listing not found' },
  notFoundBody: {
    ar: 'ربما تمت مراجعة هذا الإعلان بالفعل أو تم حذفه.',
    fr: 'Cette annonce a peut-être déjà été traitée ou supprimée.',
    en: 'This listing may have already been reviewed or removed.',
  },
  loading: { ar: 'جارٍ التحميل…', fr: 'Chargement…', en: 'Loading…' },
  // ── Confirmation + toasts ────────────────────────────────────────────────
  confirmApproveTitle: {
    ar: 'الموافقة على هذا الإعلان؟',
    fr: 'Approuver cette annonce ?',
    en: 'Approve this listing?',
  },
  confirmApproveBody: {
    ar: 'سيصبح الإعلان مرئيًا للضيوف فورًا ويُخطَر المضيف.',
    fr: 'L’annonce deviendra immédiatement visible par les voyageurs et l’hôte sera notifié.',
    en: 'The listing becomes visible to guests immediately and the host is notified.',
  },
  confirmRejectTitle: {
    ar: 'رفض هذا الإعلان؟',
    fr: 'Rejeter cette annonce ?',
    en: 'Reject this listing?',
  },
  confirmRejectBody: {
    ar: 'سيُخطَر المضيف بالسبب ويمكنه التعديل وإعادة الإرسال.',
    fr: 'L’hôte sera notifié du motif et pourra modifier puis resoumettre.',
    en: 'The host is notified with the reason and can edit and resubmit.',
  },
  toastApproved: {
    ar: 'تمت الموافقة على الإعلان',
    fr: 'Annonce approuvée',
    en: 'Listing approved',
  },
  toastRejected: {
    ar: 'تم رفض الإعلان',
    fr: 'Annonce rejetée',
    en: 'Listing rejected',
  },
  cancel: { ar: 'إلغاء', fr: 'Annuler', en: 'Cancel' },
  openPhoto: { ar: 'فتح الصورة', fr: 'Ouvrir la photo', en: 'Open photo' },
  closePhoto: { ar: 'إغلاق الصورة', fr: 'Fermer la photo', en: 'Close photo' },
  coverLabel: { ar: 'الغلاف', fr: 'Couverture', en: 'Cover' },
} satisfies Record<string, L10n>;

/** property_status enum → localized label + pill variant key. */
export const PROPERTY_STATUS: Record<
  string,
  { label: L10n; variant: 'neutral' | 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: { label: { ar: 'مسودة', fr: 'Brouillon', en: 'Draft' }, variant: 'neutral' },
  pending: { label: { ar: 'قيد المراجعة', fr: 'En attente', en: 'Pending' }, variant: 'warning' },
  approved: { label: { ar: 'مُعتمد', fr: 'Approuvée', en: 'Approved' }, variant: 'success' },
  rejected: { label: { ar: 'مرفوض', fr: 'Rejetée', en: 'Rejected' }, variant: 'error' },
  suspended: { label: { ar: 'موقوف', fr: 'Suspendue', en: 'Suspended' }, variant: 'error' },
};

/** Resolve a property-status pill descriptor (neutral fallback for unknowns). */
export function propertyStatusPill(
  status: string | null | undefined,
  locale: Locale,
): { label: string; variant: 'neutral' | 'success' | 'warning' | 'error' | 'info' } {
  if (status && PROPERTY_STATUS[status]) {
    const s = PROPERTY_STATUS[status];
    return { label: s.label[locale], variant: s.variant };
  }
  return { label: status ?? '—', variant: 'neutral' };
}

/** Format an ISO timestamp with Latin digits, per locale (docs/07 §6). */
export function formatDateTime(iso: string | null, locale: Locale): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const bcp47 = locale === 'ar' ? 'ar-DZ-u-nu-latn' : `${locale}-u-nu-latn`;
  return new Intl.DateTimeFormat(bcp47, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

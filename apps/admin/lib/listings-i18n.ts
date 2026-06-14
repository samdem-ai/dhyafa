/**
 * Inline AR / FR / EN strings for the admin Listings page.
 *
 * Mirrors the inline-object localization style used in lib/moderation-i18n.ts
 * and lib/admin-i18n.ts (the i18next bundles don't yet carry an `admin`
 * namespace). Arabic is the default/primary locale.
 *
 * This page covers ALL property statuses (the moderation queue is pending-only).
 * It reuses the shared `propertyStatusPill` + `formatDateTime` from
 * moderation-i18n so the status pills and timestamps match exactly.
 */

import type { Locale } from '@dyafa/i18n';
import type { L10n } from './admin-i18n';

/** The full property_status vocabulary (matches the property_status enum). */
export const PROPERTY_STATUS_KEYS = [
  'pending',
  'approved',
  'rejected',
  'suspended',
] as const;

export type PropertyStatusFilter = (typeof PROPERTY_STATUS_KEYS)[number];

/** Runtime guard for a status filter coming off the URL. */
export function isPropertyStatusFilter(v: unknown): v is PropertyStatusFilter {
  return typeof v === 'string' && (PROPERTY_STATUS_KEYS as readonly string[]).includes(v);
}

/** Shared UI copy for the Listings page. */
export const L = {
  title: { ar: 'الإعلانات', fr: 'Annonces', en: 'Listings' },
  subtitle: {
    ar: 'كل الإعلانات عبر المنصة',
    fr: 'Toutes les annonces de la plateforme',
    en: 'All listings across the platform',
  },
  // ── Filters ───────────────────────────────────────────────────────────────
  searchPlaceholder: {
    ar: 'ابحث بالعنوان أو المضيف…',
    fr: 'Rechercher par titre ou hôte…',
    en: 'Search by title or host…',
  },
  statusLabel: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  statusAll: { ar: 'كل الحالات', fr: 'Tous les statuts', en: 'All statuses' },
  wilayaLabel: { ar: 'الولاية', fr: 'Wilaya', en: 'Wilaya' },
  wilayaAll: { ar: 'كل الولايات', fr: 'Toutes les wilayas', en: 'All wilayas' },
  // ── Status option labels (mirror PROPERTY_STATUS in moderation-i18n) ────────
  statusPending: { ar: 'قيد المراجعة', fr: 'En attente', en: 'Pending' },
  statusApproved: { ar: 'مُعتمد', fr: 'Approuvée', en: 'Approved' },
  statusRejected: { ar: 'مرفوض', fr: 'Rejetée', en: 'Rejected' },
  statusSuspended: { ar: 'موقوف', fr: 'Suspendue', en: 'Suspended' },
  // ── Columns ───────────────────────────────────────────────────────────────
  colTitle: { ar: 'الإعلان', fr: 'Annonce', en: 'Listing' },
  colHost: { ar: 'المضيف', fr: 'Hôte', en: 'Host' },
  colWilaya: { ar: 'الولاية', fr: 'Wilaya', en: 'Wilaya' },
  colType: { ar: 'النوع', fr: 'Type', en: 'Type' },
  colStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  colCreated: { ar: 'تاريخ الإنشاء', fr: 'Créé le', en: 'Created' },
  colPhotos: { ar: 'الصور', fr: 'Photos', en: 'Photos' },
  // ── Row actions ─────────────────────────────────────────────────────────────
  rowActions: { ar: 'إجراءات', fr: 'Actions', en: 'Actions' },
  review: { ar: 'مراجعة', fr: 'Examiner', en: 'Review' },
  suspend: { ar: 'إيقاف', fr: 'Suspendre', en: 'Suspend' },
  restore: { ar: 'استعادة', fr: 'Restaurer', en: 'Restore' },
  // ── Empty / fallbacks ───────────────────────────────────────────────────────
  untitled: { ar: 'بدون عنوان', fr: 'Sans titre', en: 'Untitled' },
  unknownHost: { ar: 'مضيف غير معروف', fr: 'Hôte inconnu', en: 'Unknown host' },
  emptyTitle: { ar: 'لا توجد إعلانات', fr: 'Aucune annonce', en: 'No listings' },
  emptyBody: {
    ar: 'لا توجد إعلانات مطابقة للمرشّحات الحالية.',
    fr: 'Aucune annonce ne correspond aux filtres actuels.',
    en: 'No listings match the current filters.',
  },
  emptyNoResults: {
    ar: 'لا توجد إعلانات مطابقة لبحثك.',
    fr: 'Aucune annonce ne correspond à votre recherche.',
    en: 'No listings match your search.',
  },
  errorTitle: { ar: 'تعذّر تحميل الإعلانات', fr: 'Échec du chargement', en: 'Failed to load listings' },
  // ── Confirmations ───────────────────────────────────────────────────────────
  confirmSuspendTitle: {
    ar: 'إيقاف هذا الإعلان؟',
    fr: 'Suspendre cette annonce ?',
    en: 'Suspend this listing?',
  },
  confirmSuspendBody: {
    ar: 'سيُخفى الإعلان عن الضيوف فورًا ويُخطَر المضيف.',
    fr: 'L’annonce sera immédiatement masquée aux voyageurs et l’hôte sera notifié.',
    en: 'The listing is hidden from guests immediately and the host is notified.',
  },
  confirmRestoreTitle: {
    ar: 'استعادة هذا الإعلان؟',
    fr: 'Restaurer cette annonce ?',
    en: 'Restore this listing?',
  },
  confirmRestoreBody: {
    ar: 'سيعود الإعلان مرئيًا للضيوف ويُخطَر المضيف.',
    fr: 'L’annonce redeviendra visible par les voyageurs et l’hôte sera notifié.',
    en: 'The listing becomes visible to guests again and the host is notified.',
  },
  // ── Toasts ───────────────────────────────────────────────────────────────────
  toastSuspended: { ar: 'تم إيقاف الإعلان', fr: 'Annonce suspendue', en: 'Listing suspended' },
  toastRestored: { ar: 'تمت استعادة الإعلان', fr: 'Annonce restaurée', en: 'Listing restored' },
  // ── Generic action copy ──────────────────────────────────────────────────────
  cancel: { ar: 'إلغاء', fr: 'Annuler', en: 'Cancel' },
  actionFailed: { ar: 'تعذّر إكمال العملية', fr: 'Échec de l’opération', en: 'Action failed' },
  errorNotAuthorized: {
    ar: 'انتهت الجلسة أو لا تملك صلاحية. يرجى تسجيل الدخول من جديد.',
    fr: 'Session expirée ou non autorisée. Veuillez vous reconnecter.',
    en: 'Session expired or not authorized. Please sign in again.',
  },
  errorNotFound: {
    ar: 'لم يُعد الإعلان في الحالة المتوقعة. ربما تغيّرت حالته.',
    fr: 'L’annonce n’est plus dans l’état attendu. Son statut a peut-être changé.',
    en: 'The listing is no longer in the expected state. Its status may have changed.',
  },
} satisfies Record<string, L10n>;

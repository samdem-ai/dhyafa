/**
 * Inline AR / FR / EN strings + localization helpers for the HOTEL dashboard.
 *
 * Mirrors the inline-object style of apps/admin/lib/moderation-i18n.ts. Arabic is
 * the primary/default locale (fallback chain ar → fr → en for DB fields).
 *
 * Keep all user-facing copy here so pages/components stay markup-only.
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
 * Returns the requested locale if present, else the first non-empty value in
 * fallback order, else `null`.
 */
export function localizedField(
  row: { ar?: string | null; fr?: string | null; en?: string | null },
  locale: Locale,
): string | null {
  const order: Locale[] =
    locale === 'ar'
      ? ['ar', 'fr', 'en']
      : locale === 'fr'
        ? ['fr', 'ar', 'en']
        : ['en', 'fr', 'ar'];
  for (const l of order) {
    const v = row[l];
    if (v && v.trim().length > 0) return v;
  }
  return null;
}

/** BCP-47 tag pinned to Latin digits (Western Arabic numerals everywhere). */
function bcp47(locale: Locale): string {
  return locale === 'ar' ? 'ar-DZ-u-nu-latn' : `${locale}-u-nu-latn`;
}

/** Format an ISO timestamp with date + time, Latin digits, per locale. */
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

/** Format an ISO date (no time), Latin digits, per locale. */
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

/** Short month label for a 0-indexed month, per locale (analytics axes). */
export function monthLabel(monthIndex0: number, locale: Locale): string {
  const d = new Date(2020, monthIndex0, 1);
  return new Intl.DateTimeFormat(bcp47(locale), { month: 'short' }).format(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared brand / chrome / nav copy
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  brand: { ar: 'دافة', fr: 'Dyafa', en: 'Dyafa' },
  dashboardLabel: {
    ar: 'لوحة المضيفين',
    fr: 'Tableau de bord hôtelier',
    en: 'Hotel Dashboard',
  },
  signOut: { ar: 'تسجيل الخروج', fr: 'Se déconnecter', en: 'Sign out' },
  signingOut: { ar: 'جارٍ الخروج…', fr: 'Déconnexion…', en: 'Signing out…' },
  menu: { ar: 'القائمة', fr: 'Menu', en: 'Menu' },
  roleOwner: { ar: 'المالك', fr: 'Propriétaire', en: 'Owner' },
  roleManager: { ar: 'مدير', fr: 'Gérant', en: 'Manager' },
  roleReception: { ar: 'استقبال', fr: 'Réception', en: 'Reception' },

  // Nav items
  navOverview: { ar: 'نظرة عامة', fr: 'Vue d’ensemble', en: 'Overview' },
  navProperties: { ar: 'العقارات', fr: 'Propriétés', en: 'Properties' },
  navCalendar: { ar: 'التقويم', fr: 'Calendrier', en: 'Calendar' },
  navReservations: { ar: 'الحجوزات', fr: 'Réservations', en: 'Reservations' },
  navMessages: { ar: 'الرسائل', fr: 'Messages', en: 'Messages' },
  navReviews: { ar: 'التقييمات', fr: 'Avis', en: 'Reviews' },
  navAnalytics: { ar: 'الإحصائيات', fr: 'Analytiques', en: 'Analytics' },
  navPayouts: { ar: 'المدفوعات', fr: 'Virements', en: 'Payouts' },
  navStaff: { ar: 'الفريق', fr: 'Équipe', en: 'Staff' },

  // Generic states
  loading: { ar: 'جارٍ التحميل…', fr: 'Chargement…', en: 'Loading…' },
  errorTitle: { ar: 'حدث خطأ', fr: 'Une erreur est survenue', en: 'Something went wrong' },
  errorBody: {
    ar: 'تعذّر تحميل البيانات. حاول مرة أخرى.',
    fr: 'Impossible de charger les données. Réessayez.',
    en: 'Could not load the data. Please try again.',
  },
  retry: { ar: 'إعادة المحاولة', fr: 'Réessayer', en: 'Retry' },
  notProvided: { ar: 'غير متوفر', fr: 'Non renseigné', en: 'Not provided' },
  none: { ar: 'لا شيء', fr: 'Aucun', en: 'None' },
  cancel: { ar: 'إلغاء', fr: 'Annuler', en: 'Cancel' },
  edit: { ar: 'تعديل', fr: 'Modifier', en: 'Edit' },
  save: { ar: 'حفظ', fr: 'Enregistrer', en: 'Save' },
  saving: { ar: 'جارٍ الحفظ…', fr: 'Enregistrement…', en: 'Saving…' },
  saved: { ar: 'تم الحفظ', fr: 'Enregistré', en: 'Saved' },
  send: { ar: 'إرسال', fr: 'Envoyer', en: 'Send' },
  sending: { ar: 'جارٍ الإرسال…', fr: 'Envoi…', en: 'Sending…' },
  search: { ar: 'بحث', fr: 'Rechercher', en: 'Search' },
  all: { ar: 'الكل', fr: 'Tous', en: 'All' },
  viewAll: { ar: 'عرض الكل', fr: 'Voir tout', en: 'View all' },
  back: { ar: '→ رجوع', fr: '→ Retour', en: '→ Back' },
  perNight: { ar: '/ ليلة', fr: '/ nuit', en: '/ night' },
  readOnlyNotice: {
    ar: 'حسابك (استقبال) لا يملك صلاحية تعديل هذا القسم.',
    fr: 'Votre rôle (réception) ne permet pas de modifier cette section.',
    en: 'Your role (reception) cannot edit this section.',
  },
  accessDenied: {
    ar: 'لا تملك صلاحية الوصول إلى هذا القسم.',
    fr: 'Vous n’avez pas accès à cette section.',
    en: 'You do not have access to this section.',
  },

  // ── Sign-in ──────────────────────────────────────────────────────────────
  signInTitle: { ar: 'تسجيل الدخول', fr: 'Connexion', en: 'Sign in' },
  signInSubtitle: {
    ar: 'لوحة تحكم الفنادق والمضيفين',
    fr: 'Console hôtels & hébergeurs',
    en: 'Hotels & hosts console',
  },
  email: { ar: 'البريد الإلكتروني', fr: 'E-mail', en: 'Email' },
  password: { ar: 'كلمة المرور', fr: 'Mot de passe', en: 'Password' },
  signInSubmit: { ar: 'دخول', fr: 'Se connecter', en: 'Sign in' },
  signInSubmitting: { ar: 'جارٍ الدخول…', fr: 'Connexion…', en: 'Signing in…' },
  errBadCreds: {
    ar: 'بريد إلكتروني أو كلمة مرور غير صحيحة.',
    fr: 'E-mail ou mot de passe incorrect.',
    en: 'Invalid email or password.',
  },
  errNotHost: {
    ar: 'هذا الحساب لا يملك صلاحية الوصول إلى لوحة المضيفين.',
    fr: 'Ce compte n’a pas accès au tableau de bord hôtelier.',
    en: 'This account is not authorized for the hotel dashboard.',
  },
  errGeneric: {
    ar: 'تعذّر تسجيل الدخول. حاول مرة أخرى.',
    fr: 'Échec de la connexion. Réessayez.',
    en: 'Could not sign in. Please try again.',
  },

  // ── Overview ───────────────────────────────────────────────────────────────
  ovTitle: { ar: 'نظرة عامة', fr: 'Vue d’ensemble', en: 'Overview' },
  ovWelcome: { ar: 'مرحبًا', fr: 'Bonjour', en: 'Welcome' },
  ovCheckinsToday: { ar: 'وصول اليوم', fr: 'Arrivées aujourd’hui', en: 'Check-ins today' },
  ovCheckoutsToday: { ar: 'مغادرة اليوم', fr: 'Départs aujourd’hui', en: 'Check-outs today' },
  ovOccupancy: { ar: 'الإشغال (هذا الشهر)', fr: 'Occupation (ce mois)', en: 'Occupancy (this month)' },
  ovRevenue: { ar: 'الإيرادات (هذا الشهر)', fr: 'Revenus (ce mois)', en: 'Revenue (this month)' },
  ovRevenueSub: {
    ar: 'صافي بعد العمولة',
    fr: 'net après commission',
    en: 'net after commission',
  },
  ovConfirmedBookings: { ar: 'حجوزات مؤكدة', fr: 'réservations confirmées', en: 'confirmed bookings' },
  ovRoomsReturning: {
    ar: 'غرف تُطرح للحجز من جديد',
    fr: 'chambres remises en vente',
    en: 'rooms returning to inventory',
  },
  ovPendingActions: { ar: 'إجراءات مطلوبة', fr: 'Actions requises', en: 'Actions required' },
  ovNoPending: {
    ar: 'لا توجد إجراءات معلّقة. كل شيء على ما يرام.',
    fr: 'Aucune action en attente. Tout est à jour.',
    en: 'No pending actions. You’re all caught up.',
  },
  ovBookingRequests: {
    ar: 'طلبات حجز بانتظار ردّك',
    fr: 'demandes de réservation en attente',
    en: 'booking requests awaiting your response',
  },
  ovUnreadMessages: {
    ar: 'رسائل غير مقروءة من ضيوف',
    fr: 'messages non lus de voyageurs',
    en: 'unread guest messages',
  },
  ovUpcoming: { ar: 'الحجوزات القادمة', fr: 'Réservations à venir', en: 'Upcoming reservations' },
  ovNoUpcoming: {
    ar: 'لا توجد حجوزات قادمة.',
    fr: 'Aucune réservation à venir.',
    en: 'No upcoming reservations.',
  },

  // ── Properties ───────────────────────────────────────────────────────────
  propTitle: { ar: 'العقارات', fr: 'Propriétés', en: 'Properties' },
  propSubtitle: {
    ar: 'إدارة عقاراتك وأنواع الغرف والأسعار',
    fr: 'Gérez vos propriétés, types de chambres et tarifs',
    en: 'Manage your properties, room types and pricing',
  },
  propEmpty: {
    ar: 'لا توجد عقارات بعد. أنشئ عقارك الأول من تطبيق الجوال.',
    fr: 'Aucune propriété pour le moment. Créez votre première depuis l’app mobile.',
    en: 'No properties yet. Create your first one from the mobile app.',
  },
  propRoomTypes: { ar: 'أنواع الغرف', fr: 'Types de chambres', en: 'Room types' },
  propPhotos: { ar: 'الصور', fr: 'Photos', en: 'Photos' },
  propAmenities: { ar: 'المرافق', fr: 'Équipements', en: 'Amenities' },
  propBasePrice: { ar: 'السعر الأساسي', fr: 'Prix de base', en: 'Base price' },
  propWeekendPrice: { ar: 'سعر العطلة', fr: 'Prix week-end', en: 'Weekend price' },
  propInventory: { ar: 'عدد الوحدات', fr: 'Unités', en: 'Inventory' },
  propCapacity: { ar: 'السعة', fr: 'Capacité', en: 'Capacity' },
  propBeds: { ar: 'الأسرّة', fr: 'Lits', en: 'Beds' },
  propManageCalendar: { ar: 'إدارة التقويم', fr: 'Gérer le calendrier', en: 'Manage calendar' },
  propManagePricing: { ar: 'الأسعار والتقويم', fr: 'Tarifs & calendrier', en: 'Pricing & calendar' },
  propGuests: { ar: 'ضيوف', fr: 'invités', en: 'guests' },
  propNoRoomTypes: { ar: 'لا توجد غرف معرّفة.', fr: 'Aucune chambre définie.', en: 'No room types defined.' },
  propLocation: { ar: 'الموقع', fr: 'Emplacement', en: 'Location' },
  propRating: { ar: 'التقييم', fr: 'Note', en: 'Rating' },
  propReviews: { ar: 'تقييم', fr: 'avis', en: 'reviews' },
  propCleaningFee: { ar: 'رسوم التنظيف', fr: 'Frais de ménage', en: 'Cleaning fee' },
  propEditHint: {
    ar: 'حدّث سعر الغرفة الأساسي وسعر العطلة والمخزون. يُحفظ مباشرةً.',
    fr: 'Mettez à jour le prix de base, le prix week-end et l’inventaire. Sauvegarde immédiate.',
    en: 'Update base price, weekend price and inventory. Saves immediately.',
  },

  // Property status badges
  stDraft: { ar: 'مسودة', fr: 'Brouillon', en: 'Draft' },
  stPending: { ar: 'قيد المراجعة', fr: 'En attente', en: 'Pending' },
  stApproved: { ar: 'منشور', fr: 'Publié', en: 'Published' },
  stRejected: { ar: 'مرفوض', fr: 'Rejeté', en: 'Rejected' },
  stSuspended: { ar: 'موقوف', fr: 'Suspendu', en: 'Suspended' },

  // ── Calendar ─────────────────────────────────────────────────────────────
  calTitle: { ar: 'التقويم والأسعار', fr: 'Calendrier & tarifs', en: 'Calendar & pricing' },
  calSubtitle: {
    ar: 'حدّد نطاق تواريخ ثم أغلِق/افتح أو غيّر السعر والحد الأدنى للإقامة',
    fr: 'Sélectionnez une plage de dates puis fermez/ouvrez ou ajustez prix et séjour minimum',
    en: 'Select a date range, then close/open or set price override and min-stay',
  },
  calPickRoomType: { ar: 'اختر نوع الغرفة', fr: 'Choisir le type de chambre', en: 'Choose room type' },
  calNoRoomTypes: {
    ar: 'لا توجد أنواع غرف لإدارة تقويمها.',
    fr: 'Aucun type de chambre à gérer.',
    en: 'No room types to manage.',
  },
  calRangeFrom: { ar: 'من', fr: 'Du', en: 'From' },
  calRangeTo: { ar: 'إلى', fr: 'Au', en: 'To' },
  calClose: { ar: 'إغلاق الفترة', fr: 'Fermer la période', en: 'Close range' },
  calOpen: { ar: 'فتح الفترة', fr: 'Ouvrir la période', en: 'Open range' },
  calPriceOverride: { ar: 'سعر مخصّص للفترة (دج)', fr: 'Prix spécifique (DZD)', en: 'Price override (DZD)' },
  calMinStay: { ar: 'حد أدنى للإقامة (ليالٍ)', fr: 'Séjour min. (nuits)', en: 'Min-stay (nights)' },
  calApply: { ar: 'تطبيق على الفترة', fr: 'Appliquer à la plage', en: 'Apply to range' },
  calApplying: { ar: 'جارٍ التطبيق…', fr: 'Application…', en: 'Applying…' },
  calApplied: {
    ar: 'تم تحديث {n} يومًا',
    fr: '{n} jour(s) mis à jour',
    en: '{n} day(s) updated',
  },
  calLegendOpen: { ar: 'متاح', fr: 'Ouvert', en: 'Open' },
  calLegendClosed: { ar: 'مغلق', fr: 'Fermé', en: 'Closed' },
  calLegendOverride: { ar: 'سعر مخصّص', fr: 'Prix spécifique', en: 'Price override' },
  calRangeRequired: {
    ar: 'اختر تاريخ البداية والنهاية.',
    fr: 'Choisissez une date de début et de fin.',
    en: 'Pick a start and end date.',
  },
  calPrevMonth: { ar: 'الشهر السابق', fr: 'Mois précédent', en: 'Previous month' },
  calNextMonth: { ar: 'الشهر التالي', fr: 'Mois suivant', en: 'Next month' },
  calRatePlans: { ar: 'خطط الأسعار', fr: 'Plans tarifaires', en: 'Rate plans' },
  calRatePlansHint: {
    ar: 'أسعار العطلات والمواسم تُدار عبر خطط الأسعار حسب الأولوية.',
    fr: 'Les tarifs week-end et saisonniers sont gérés par plans, selon la priorité.',
    en: 'Weekend and seasonal pricing is handled via priority-ranked rate plans.',
  },
  calNoRatePlans: {
    ar: 'لا توجد خطط أسعار. يُطبَّق السعر الأساسي.',
    fr: 'Aucun plan tarifaire. Le prix de base s’applique.',
    en: 'No rate plans. The base price applies.',
  },
  calAddRatePlan: { ar: 'إضافة خطة سعر', fr: 'Ajouter un plan', en: 'Add rate plan' },
  calKind: { ar: 'النوع', fr: 'Type', en: 'Kind' },
  calLabel: { ar: 'التسمية', fr: 'Libellé', en: 'Label' },
  calPriority: { ar: 'الأولوية', fr: 'Priorité', en: 'Priority' },
  calPrice: { ar: 'السعر', fr: 'Prix', en: 'Price' },
  calAdjust: { ar: 'التعديل', fr: 'Ajustement', en: 'Adjustment' },
  calWeekdays: { ar: 'أيام الأسبوع', fr: 'Jours', en: 'Weekdays' },
  calDates: { ar: 'التواريخ', fr: 'Dates', en: 'Dates' },
  rpBase: { ar: 'أساسي', fr: 'Base', en: 'Base' },
  rpWeekend: { ar: 'عطلة', fr: 'Week-end', en: 'Weekend' },
  rpSeasonal: { ar: 'موسمي', fr: 'Saisonnier', en: 'Seasonal' },
  rpLongStay: { ar: 'إقامة طويلة', fr: 'Long séjour', en: 'Long stay' },

  // ── Reservations ───────────────────────────────────────────────────────────
  resTitle: { ar: 'الحجوزات', fr: 'Réservations', en: 'Reservations' },
  resSubtitle: {
    ar: 'اقبل الطلبات أو ارفضها، وأدِر الحجوزات القائمة',
    fr: 'Acceptez ou refusez les demandes, gérez les réservations',
    en: 'Accept or decline requests and manage existing bookings',
  },
  resSearch: {
    ar: 'ابحث بالاسم أو رمز الحجز…',
    fr: 'Rechercher par nom ou code…',
    en: 'Search by guest or code…',
  },
  resEmpty: { ar: 'لا توجد حجوزات مطابقة.', fr: 'Aucune réservation correspondante.', en: 'No matching reservations.' },
  resGuest: { ar: 'الضيف', fr: 'Voyageur', en: 'Guest' },
  resProperty: { ar: 'العقار', fr: 'Propriété', en: 'Property' },
  resDates: { ar: 'التواريخ', fr: 'Dates', en: 'Dates' },
  resGuests: { ar: 'الضيوف', fr: 'Voyageurs', en: 'Guests' },
  resTotal: { ar: 'الإجمالي', fr: 'Total', en: 'Total' },
  resStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  resCode: { ar: 'رمز الحجز', fr: 'Code', en: 'Code' },
  resSpecialRequests: { ar: 'طلبات خاصة', fr: 'Demandes spéciales', en: 'Special requests' },
  resAccept: { ar: 'قبول الطلب', fr: 'Accepter', en: 'Accept' },
  resDecline: { ar: 'رفض الطلب', fr: 'Refuser', en: 'Decline' },
  resCancel: { ar: 'إلغاء الحجز', fr: 'Annuler la réservation', en: 'Cancel booking' },
  resCancelReason: { ar: 'سبب الإلغاء', fr: 'Motif d’annulation', en: 'Cancellation reason' },
  resCancelReasonPh: {
    ar: 'وضّح سبب الإلغاء…',
    fr: 'Précisez le motif…',
    en: 'Explain the reason…',
  },
  resNights: { ar: 'ليالٍ', fr: 'nuits', en: 'nights' },
  resAdults: { ar: 'بالغون', fr: 'adultes', en: 'adults' },
  resChildren: { ar: 'أطفال', fr: 'enfants', en: 'children' },
  resCancelNoRefundNote: {
    ar: 'الإلغاء مع استرجاع المبلغ متاح للمديرين فقط.',
    fr: 'L’annulation avec remboursement est réservée aux gérants.',
    en: 'Cancellation with refund is restricted to managers.',
  },
  resActionDone: { ar: 'تم تنفيذ الإجراء', fr: 'Action effectuée', en: 'Action completed' },

  // Booking status labels
  bsRequested: { ar: 'طلب جديد', fr: 'Demande', en: 'Requested' },
  bsDeclined: { ar: 'مرفوض', fr: 'Refusé', en: 'Declined' },
  bsAwaitingPayment: { ar: 'بانتظار الدفع', fr: 'En attente de paiement', en: 'Awaiting payment' },
  bsConfirmed: { ar: 'مؤكد', fr: 'Confirmé', en: 'Confirmed' },
  bsCheckedIn: { ar: 'تم الوصول', fr: 'Enregistré', en: 'Checked in' },
  bsCompleted: { ar: 'مكتمل', fr: 'Terminé', en: 'Completed' },
  bsCancelled: { ar: 'ملغى', fr: 'Annulé', en: 'Cancelled' },
  bsNoShow: { ar: 'لم يحضر', fr: 'Non présenté', en: 'No-show' },
  bsExpired: { ar: 'منتهٍ', fr: 'Expiré', en: 'Expired' },

  // ── Messages ─────────────────────────────────────────────────────────────
  msgTitle: { ar: 'الرسائل', fr: 'Messages', en: 'Messages' },
  msgEmpty: { ar: 'لا توجد محادثات بعد.', fr: 'Aucune conversation.', en: 'No conversations yet.' },
  msgSelectConversation: {
    ar: 'اختر محادثة لعرضها',
    fr: 'Sélectionnez une conversation',
    en: 'Select a conversation',
  },
  msgPlaceholder: { ar: 'اكتب رسالة…', fr: 'Écrire un message…', en: 'Write a message…' },
  msgGuest: { ar: 'ضيف', fr: 'Voyageur', en: 'Guest' },
  msgNoMessages: { ar: 'لا توجد رسائل بعد.', fr: 'Aucun message.', en: 'No messages yet.' },
  msgYou: { ar: 'أنت', fr: 'Vous', en: 'You' },

  // ── Reviews ──────────────────────────────────────────────────────────────
  revTitle: { ar: 'التقييمات', fr: 'Avis', en: 'Reviews' },
  revSubtitle: {
    ar: 'تقييمات ضيوف عقاراتك — يمكنك الرد مرة واحدة على كل تقييم',
    fr: 'Avis des voyageurs sur vos propriétés — une réponse par avis',
    en: 'Guest reviews for your properties — reply once per review',
  },
  revEmpty: { ar: 'لا توجد تقييمات بعد.', fr: 'Aucun avis pour le moment.', en: 'No reviews yet.' },
  revReply: { ar: 'الرد على التقييم', fr: 'Répondre', en: 'Reply' },
  revReplyPlaceholder: {
    ar: 'اكتب ردًّا مهذّبًا…',
    fr: 'Rédigez une réponse courtoise…',
    en: 'Write a courteous reply…',
  },
  revYourReply: { ar: 'ردّك', fr: 'Votre réponse', en: 'Your reply' },
  revOverall: { ar: 'التقييم العام', fr: 'Note globale', en: 'Overall' },
  revReplied: { ar: 'تم الرد', fr: 'Répondu', en: 'Replied' },

  // ── Analytics ──────────────────────────────────────────────────────────────
  anTitle: { ar: 'الإحصائيات', fr: 'Analytiques', en: 'Analytics' },
  anSubtitle: {
    ar: 'الأداء والإيرادات والإشغال ومعدّل التحويل',
    fr: 'Performance, revenus, occupation et conversion',
    en: 'Performance, revenue, occupancy and conversion',
  },
  anOccupancy: { ar: 'معدل الإشغال', fr: 'Taux d’occupation', en: 'Occupancy rate' },
  anAdr: { ar: 'متوسط السعر الليلي (ADR)', fr: 'Prix moyen / nuit (ADR)', en: 'Avg daily rate (ADR)' },
  anRevenueOverTime: { ar: 'الإيرادات عبر الزمن', fr: 'Revenus dans le temps', en: 'Revenue over time' },
  anConversion: { ar: 'المشاهدات ← الحجوزات', fr: 'Vues → réservations', en: 'Views → bookings' },
  anTopRoomTypes: { ar: 'أكثر الغرف حجزًا', fr: 'Chambres les plus réservées', en: 'Top room types' },
  anReviewTrend: { ar: 'اتجاه التقييمات', fr: 'Tendance des avis', en: 'Review trend' },
  anBookings: { ar: 'الحجوزات', fr: 'Réservations', en: 'Bookings' },
  anGmv: { ar: 'إجمالي المبيعات', fr: 'Volume brut', en: 'Gross bookings' },
  anNet: { ar: 'الصافي', fr: 'Net', en: 'Net' },
  anCommission: { ar: 'العمولة', fr: 'Commission', en: 'Commission' },
  anAvgRating: { ar: 'متوسط التقييم', fr: 'Note moyenne', en: 'Avg rating' },
  anResponseRate: { ar: 'معدل الاستجابة', fr: 'Taux de réponse', en: 'Response rate' },
  anCancelRate: { ar: 'معدل الإلغاء', fr: 'Taux d’annulation', en: 'Cancellation rate' },
  anNoData: { ar: 'لا توجد بيانات كافية بعد.', fr: 'Pas encore assez de données.', en: 'Not enough data yet.' },
  anReceptionLimited: {
    ar: 'حساب الاستقبال يرى مؤشّر الإشغال فقط.',
    fr: 'Le rôle réception ne voit que l’occupation.',
    en: 'Reception role sees occupancy only.',
  },

  // ── Payouts ──────────────────────────────────────────────────────────────
  poTitle: { ar: 'المدفوعات', fr: 'Virements', en: 'Payouts' },
  poSubtitle: {
    ar: 'كشوف الحساب وتفصيل العمولة وسجلّ المدفوعات',
    fr: 'Relevés, détail des commissions et historique',
    en: 'Statements, commission breakdown and history',
  },
  poEmpty: { ar: 'لا توجد مدفوعات بعد.', fr: 'Aucun virement pour le moment.', en: 'No payouts yet.' },
  poPeriod: { ar: 'الفترة', fr: 'Période', en: 'Period' },
  poGross: { ar: 'الإجمالي', fr: 'Brut', en: 'Gross' },
  poCommission: { ar: 'العمولة', fr: 'Commission', en: 'Commission' },
  poNet: { ar: 'الصافي', fr: 'Net', en: 'Net' },
  poStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  poPaidAt: { ar: 'تاريخ الدفع', fr: 'Payé le', en: 'Paid on' },
  poReference: { ar: 'المرجع', fr: 'Référence', en: 'Reference' },
  poRib: { ar: 'الحساب البنكي', fr: 'RIB', en: 'Bank account' },
  poTotalNet: { ar: 'إجمالي الصافي المدفوع', fr: 'Total net versé', en: 'Total net paid' },
  poTotalPending: { ar: 'قيد الانتظار', fr: 'En attente', en: 'Pending' },
  psPending: { ar: 'قيد الانتظار', fr: 'En attente', en: 'Pending' },
  psProcessing: { ar: 'قيد المعالجة', fr: 'En cours', en: 'Processing' },
  psPaid: { ar: 'مدفوع', fr: 'Payé', en: 'Paid' },
  psFailed: { ar: 'فشل', fr: 'Échoué', en: 'Failed' },
  psOnHold: { ar: 'محجوز', fr: 'En attente', en: 'On hold' },

  // ── Staff ──────────────────────────────────────────────────────────────────
  stfTitle: { ar: 'الفريق', fr: 'Équipe', en: 'Staff' },
  stfSubtitle: {
    ar: 'أضِف موظفين وحدّد أدوارهم (استقبال / مدير)',
    fr: 'Ajoutez des membres et définissez leur rôle (réception / gérant)',
    en: 'Add team members and set their role (reception / manager)',
  },
  stfMember: { ar: 'العضو', fr: 'Membre', en: 'Member' },
  stfRole: { ar: 'الدور', fr: 'Rôle', en: 'Role' },
  stfStatus: { ar: 'الحالة', fr: 'Statut', en: 'Status' },
  stfActive: { ar: 'نشط', fr: 'Actif', en: 'Active' },
  stfInvited: { ar: 'مدعوّ', fr: 'Invité', en: 'Invited' },
  stfEmpty: { ar: 'لا يوجد أعضاء فريق بعد.', fr: 'Aucun membre pour le moment.', en: 'No team members yet.' },
  stfAdd: { ar: 'إضافة عضو', fr: 'Ajouter un membre', en: 'Add member' },
  stfAddTitle: { ar: 'إضافة عضو إلى الفريق', fr: 'Ajouter un membre', en: 'Add a team member' },
  stfUserId: { ar: 'معرّف المستخدم (User ID)', fr: 'Identifiant utilisateur', en: 'User ID' },
  stfUserIdHint: {
    ar: 'الصق معرّف حساب الموظف (UUID). يجب أن يملك حسابًا على دافة.',
    fr: 'Collez l’UUID du compte. Le membre doit déjà avoir un compte Dyafa.',
    en: 'Paste the member’s account UUID. They must already have a Dyafa account.',
  },
  stfOwnerOnly: {
    ar: 'إدارة الفريق متاحة للمالك فقط.',
    fr: 'La gestion de l’équipe est réservée au propriétaire.',
    en: 'Staff management is owner-only.',
  },
  stfAdded: { ar: 'تمت إضافة العضو', fr: 'Membre ajouté', en: 'Member added' },
  stfCapabilities: { ar: 'الصلاحيات', fr: 'Permissions', en: 'Capabilities' },
  stfCapReception: {
    ar: 'الاستقبال: تسجيل الوصول/المغادرة والرسائل وقبول/رفض الطلبات (دون إلغاء مع استرجاع).',
    fr: 'Réception : arrivées/départs, messages, accepter/refuser (sans annulation avec remboursement).',
    en: 'Reception: check-in/out, messages, accept/decline requests (no refund cancellation).',
  },
  stfCapManager: {
    ar: 'المدير: كل الصلاحيات — العقارات والأسعار والتقويم والمالية والإحصائيات.',
    fr: 'Gérant : tout — propriétés, tarifs, calendrier, finances et analytiques.',
    en: 'Manager: everything — properties, pricing, calendar, finances and analytics.',
  },
} satisfies Record<string, L10n>;

// ─────────────────────────────────────────────────────────────────────────────
// Enum → localized label maps
// ─────────────────────────────────────────────────────────────────────────────

import type { Database } from '@dyafa/api-client';

type BookingStatus = Database['public']['Enums']['booking_status'];
type PropertyStatus = Database['public']['Enums']['property_status'];
type PayoutStatus = Database['public']['Enums']['payout_status'];
type RatePlanKind = Database['public']['Enums']['rate_plan_kind'];

export function bookingStatusLabel(status: BookingStatus, locale: Locale): string {
  const map: Record<BookingStatus, L10n> = {
    requested: T.bsRequested,
    declined: T.bsDeclined,
    awaiting_payment: T.bsAwaitingPayment,
    confirmed: T.bsConfirmed,
    checked_in: T.bsCheckedIn,
    completed: T.bsCompleted,
    cancelled: T.bsCancelled,
    no_show: T.bsNoShow,
    expired: T.bsExpired,
  };
  return tl(map[status], locale);
}

/** Tailwind classes for a booking-status pill. */
export function bookingStatusColor(status: BookingStatus): string {
  switch (status) {
    case 'confirmed':
    case 'checked_in':
    case 'completed':
      return 'bg-success-bg text-success';
    case 'requested':
      return 'bg-warning-bg text-warning';
    case 'awaiting_payment':
      return 'bg-info-bg text-info';
    case 'declined':
    case 'cancelled':
    case 'no_show':
    case 'expired':
      return 'bg-error-bg text-error';
    default:
      return 'bg-surface-sunken text-text-muted';
  }
}

export function propertyStatusLabel(status: PropertyStatus, locale: Locale): string {
  const map: Record<PropertyStatus, L10n> = {
    draft: T.stDraft,
    pending: T.stPending,
    approved: T.stApproved,
    rejected: T.stRejected,
    suspended: T.stSuspended,
  };
  return tl(map[status], locale);
}

export function propertyStatusColor(status: PropertyStatus): string {
  switch (status) {
    case 'approved':
      return 'bg-success-bg text-success';
    case 'pending':
      return 'bg-warning-bg text-warning';
    case 'draft':
      return 'bg-surface-sunken text-text-muted';
    case 'rejected':
    case 'suspended':
      return 'bg-error-bg text-error';
    default:
      return 'bg-surface-sunken text-text-muted';
  }
}

export function payoutStatusLabel(status: PayoutStatus, locale: Locale): string {
  const map: Record<PayoutStatus, L10n> = {
    pending: T.psPending,
    processing: T.psProcessing,
    paid: T.psPaid,
    failed: T.psFailed,
    on_hold: T.psOnHold,
  };
  return tl(map[status], locale);
}

export function payoutStatusColor(status: PayoutStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-success-bg text-success';
    case 'processing':
    case 'pending':
      return 'bg-warning-bg text-warning';
    case 'on_hold':
      return 'bg-info-bg text-info';
    case 'failed':
      return 'bg-error-bg text-error';
    default:
      return 'bg-surface-sunken text-text-muted';
  }
}

export function ratePlanKindLabel(kind: RatePlanKind, locale: Locale): string {
  const map: Record<RatePlanKind, L10n> = {
    base: T.rpBase,
    weekend: T.rpWeekend,
    seasonal: T.rpSeasonal,
    long_stay: T.rpLongStay,
  };
  return tl(map[kind], locale);
}

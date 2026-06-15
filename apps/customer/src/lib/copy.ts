/**
 * Inline localized copy for the M2 discovery/booking/trips surfaces.
 *
 * The shared @dyafa/i18n package only bundles the `common`, `auth`, and
 * `booking` namespaces (and we must not edit that package). Screens that need
 * keys beyond those namespaces use this module's `pick()` + `L` dictionaries,
 * matching the existing inline-COPY pattern already used across host screens.
 *
 * Where a shared key DOES exist (e.g. common:nav.*, booking:book_now,
 * booking:price_breakdown.*), screens should prefer t() over duplicating here.
 */

import type { Locale } from '@dyafa/i18n';

export interface LMessage {
  ar: string;
  fr: string;
  en: string;
}

/** Pick the locale variant (ar → fr → en order matches the audience). */
export function pick(m: LMessage, locale: Locale): string {
  return locale === 'fr' ? m.fr : locale === 'en' ? m.en : m.ar;
}

/**
 * Cancellation tier → its localized label + real refund-window summary.
 * A function (not a const) so it reads from `L` after it's declared below.
 */
export function cancellationTierCopy(
  tier: 'flexible' | 'moderate' | 'strict',
): { label: LMessage; window: LMessage } {
  switch (tier) {
    case 'flexible':
      return { label: L.tierFlexibleLabel, window: L.tierFlexibleWindow };
    case 'strict':
      return { label: L.tierStrictLabel, window: L.tierStrictWindow };
    case 'moderate':
    default:
      return { label: L.tierModerateLabel, window: L.tierModerateWindow };
  }
}

/** Shared discovery / booking / trips strings. */
export const L = {
  // ── Search entry ─────────────────────────────────────────────────────────
  searchTitle: { ar: 'إلى أين تريد الذهاب؟', fr: 'Où allez-vous ?', en: 'Where to?' },
  destination: { ar: 'الوجهة', fr: 'Destination', en: 'Destination' },
  anyDestination: { ar: 'كل الوجهات', fr: 'Toutes les destinations', en: 'Anywhere' },
  chooseWilaya: { ar: 'اختر الولاية', fr: 'Choisir la wilaya', en: 'Choose a wilaya' },
  dates: { ar: 'التواريخ', fr: 'Dates', en: 'Dates' },
  addDates: { ar: 'أضف التواريخ', fr: 'Ajouter des dates', en: 'Add dates' },
  anyDates: { ar: 'أي تواريخ', fr: 'Toutes dates', en: 'Any dates' },
  guests: { ar: 'الضيوف', fr: 'Voyageurs', en: 'Guests' },
  search: { ar: 'بحث', fr: 'Rechercher', en: 'Search' },
  goBack: { ar: 'رجوع', fr: 'Retour', en: 'Go back' },
  clear: { ar: 'مسح', fr: 'Effacer', en: 'Clear' },
  maxGuests: { ar: 'الحد الأقصى للضيوف', fr: 'Maximum de voyageurs', en: 'Max guests' },
  done: { ar: 'تم', fr: 'Terminé', en: 'Done' },
  apply: { ar: 'تطبيق', fr: 'Appliquer', en: 'Apply' },

  // ── Guest stepper ─────────────────────────────────────────────────────────
  adults: { ar: 'بالغون', fr: 'Adultes', en: 'Adults' },
  children: { ar: 'أطفال', fr: 'Enfants', en: 'Children' },
  guestsCount: { ar: 'ضيف', fr: 'voyageur', en: 'guest' },
  guestsCountPlural: { ar: 'ضيوف', fr: 'voyageurs', en: 'guests' },

  // ── Results / filters / sort ──────────────────────────────────────────────
  results: { ar: 'النتائج', fr: 'Résultats', en: 'Results' },
  resultsCount: { ar: 'إقامة', fr: 'logement', en: 'stay' },
  resultsCountPlural: { ar: 'إقامات', fr: 'logements', en: 'stays' },
  filters: { ar: 'تصفية', fr: 'Filtres', en: 'Filters' },
  sort: { ar: 'ترتيب', fr: 'Trier', en: 'Sort' },
  list: { ar: 'قائمة', fr: 'Liste', en: 'List' },
  map: { ar: 'خريطة', fr: 'Carte', en: 'Map' },
  sortRecommended: { ar: 'موصى به', fr: 'Recommandé', en: 'Recommended' },
  sortPriceAsc: { ar: 'السعر: من الأقل', fr: 'Prix : croissant', en: 'Price: low to high' },
  sortPriceDesc: { ar: 'السعر: من الأعلى', fr: 'Prix : décroissant', en: 'Price: high to low' },
  sortRating: { ar: 'الأعلى تقييمًا', fr: 'Mieux notés', en: 'Top rated' },
  priceRange: { ar: 'نطاق السعر (لليلة)', fr: 'Fourchette de prix (/nuit)', en: 'Price range (/night)' },
  minPrice: { ar: 'الأدنى', fr: 'Min', en: 'Min' },
  maxPrice: { ar: 'الأعلى', fr: 'Max', en: 'Max' },
  propertyType: { ar: 'نوع الإقامة', fr: 'Type de logement', en: 'Property type' },
  instantBookOnly: { ar: 'حجز فوري فقط', fr: 'Réservation instantanée', en: 'Instant book only' },
  guestRating: { ar: 'تقييم الضيوف', fr: 'Note des voyageurs', en: 'Guest rating' },
  amenities: { ar: 'المرافق', fr: 'Équipements', en: 'Amenities' },
  anyRating: { ar: 'الكل', fr: 'Toutes', en: 'Any' },
  resetFilters: { ar: 'إعادة ضبط', fr: 'Réinitialiser', en: 'Reset' },
  showResults: { ar: 'عرض النتائج', fr: 'Voir les résultats', en: 'Show results' },
  filtersApplied: { ar: 'مرشّح', fr: 'filtre', en: 'filter' },
  filtersAppliedPlural: { ar: 'مرشّحات', fr: 'filtres', en: 'filters' },

  // ── Map stub ──────────────────────────────────────────────────────────────
  mapStubTitle: { ar: 'عرض الخريطة (نموذج أولي)', fr: 'Vue carte (maquette)', en: 'Map view (stub)' },
  mapStubBody: {
    ar: 'الخريطة التفاعلية (Mapbox) تتطلب EAS dev client وستُضاف لاحقًا. في الأسفل قائمة بالدبابيس.',
    fr: 'La carte interactive (Mapbox) nécessite un EAS dev client et arrivera plus tard. Liste des repères ci-dessous.',
    en: 'The interactive map (Mapbox) needs an EAS dev client and is coming later. Pins are listed below.',
  },

  // ── Rails / explore landing ───────────────────────────────────────────────
  exploreGreeting: { ar: 'اكتشف', fr: 'Explorer', en: 'Explore' },
  railPopular: { ar: 'الأكثر طلبًا في', fr: 'Populaire à', en: 'Popular in' },
  railBeachfront: { ar: 'على شاطئ البحر', fr: 'En bord de mer', en: 'Beachfront' },
  railSahara: { ar: 'رحلات الصحراء', fr: 'Escapades sahariennes', en: 'Sahara escapes' },
  railTopRated: { ar: 'الأعلى تقييمًا', fr: 'Les mieux notés', en: 'Top rated' },

  // ── Result / detail ───────────────────────────────────────────────────────
  perNight: { ar: '/ ليلة', fr: '/ nuit', en: '/ night' },
  noReviews: { ar: 'جديد', fr: 'Nouveau', en: 'New' },
  freeCancel: { ar: 'إلغاء مجاني', fr: 'Annulation gratuite', en: 'Free cancellation' },
  instantBook: { ar: 'حجز فوري', fr: 'Résa instantanée', en: 'Instant book' },
  noResultsTitle: { ar: 'لا توجد نتائج', fr: 'Aucun résultat', en: 'No results' },
  noResultsBody: {
    ar: 'وسّع نطاق البحث أو امسح بعض المرشّحات.',
    fr: 'Élargissez votre recherche ou effacez des filtres.',
    en: 'Widen your search or clear some filters.',
  },
  loadError: {
    ar: 'تعذّر تحميل الإقامات.',
    fr: 'Impossible de charger les logements.',
    en: 'Could not load stays.',
  },

  // ── Property detail ───────────────────────────────────────────────────────
  about: { ar: 'عن المكان', fr: 'À propos', en: 'About this place' },
  whatThisPlaceOffers: { ar: 'ما يقدّمه هذا المكان', fr: 'Ce que propose ce logement', en: 'What this place offers' },
  houseRules: { ar: 'قواعد المنزل', fr: 'Règlement intérieur', en: 'House rules' },
  checkInOut: { ar: 'الوصول والمغادرة', fr: 'Arrivée et départ', en: 'Check-in & check-out' },
  checkIn: { ar: 'الوصول', fr: 'Arrivée', en: 'Check-in' },
  checkOut: { ar: 'المغادرة', fr: 'Départ', en: 'Check-out' },
  cancellationPolicy: { ar: 'سياسة الإلغاء', fr: 'Conditions d’annulation', en: 'Cancellation policy' },
  chooseRoom: { ar: 'اختر الغرفة', fr: 'Choisir la chambre', en: 'Choose a room' },
  reviews: { ar: 'التقييمات', fr: 'Avis', en: 'Reviews' },
  reviewsCount: { ar: 'تقييم', fr: 'avis', en: 'review' },
  reviewsCountPlural: { ar: 'تقييمات', fr: 'avis', en: 'reviews' },
  showAllAmenities: { ar: 'عرض كل المرافق', fr: 'Voir tous les équipements', en: 'Show all amenities' },
  showAllReviews: { ar: 'عرض كل التقييمات', fr: 'Voir tous les avis', en: 'Show all reviews' },
  perNightFrom: { ar: 'ابتداءً من', fr: 'À partir de', en: 'From' },
  notFoundTitle: { ar: 'الإعلان غير موجود', fr: 'Annonce introuvable', en: 'Listing not found' },
  notFoundBody: {
    ar: 'ربما تمت إزالة هذا الإعلان أو لم يعد متاحًا.',
    fr: 'Cette annonce a peut-être été retirée.',
    en: 'This listing may have been removed or is no longer available.',
  },
  reviewCleanliness: { ar: 'النظافة', fr: 'Propreté', en: 'Cleanliness' },
  reviewAccuracy: { ar: 'الدقة', fr: 'Exactitude', en: 'Accuracy' },
  reviewLocation: { ar: 'الموقع', fr: 'Emplacement', en: 'Location' },
  reviewValue: { ar: 'القيمة', fr: 'Rapport qualité-prix', en: 'Value' },
  reviewCheckin: { ar: 'الوصول', fr: 'Arrivée', en: 'Check-in' },
  reviewCommunication: { ar: 'التواصل', fr: 'Communication', en: 'Communication' },

  // ── Cancellation tiers (plain summaries) ──────────────────────────────────
  cancelFlexible: {
    ar: 'إلغاء مرن: استرداد كامل قبل الوصول بمدة قصيرة.',
    fr: 'Flexible : remboursement intégral peu avant l’arrivée.',
    en: 'Flexible: full refund up to shortly before check-in.',
  },
  cancelModerate: {
    ar: 'معتدل: استرداد كامل حتى عدة أيام قبل الوصول.',
    fr: 'Modéré : remboursement intégral plusieurs jours avant l’arrivée.',
    en: 'Moderate: full refund up to several days before check-in.',
  },
  cancelStrict: {
    ar: 'صارم: استرداد محدود بعد الحجز.',
    fr: 'Strict : remboursement limité après la réservation.',
    en: 'Strict: limited refund after booking.',
  },

  // ── Booking flow ──────────────────────────────────────────────────────────
  yourTrip: { ar: 'رحلتك', fr: 'Votre voyage', en: 'Your trip' },
  confirmAndBook: { ar: 'التأكيد والحجز', fr: 'Confirmer et réserver', en: 'Confirm & book' },
  reviewBooking: { ar: 'مراجعة الحجز', fr: 'Vérifier la réservation', en: 'Review booking' },
  guestDetails: { ar: 'بيانات الضيف', fr: 'Détails du voyageur', en: 'Guest details' },
  specialRequests: { ar: 'طلبات خاصة', fr: 'Demandes spéciales', en: 'Special requests' },
  specialRequestsHint: {
    ar: 'مثال: وصول متأخر، احتياجات إمكانية الوصول…',
    fr: 'Ex. : arrivée tardive, besoins d’accessibilité…',
    en: 'e.g. late arrival, accessibility needs…',
  },
  fullName: { ar: 'الاسم الكامل', fr: 'Nom complet', en: 'Full name' },
  phone: { ar: 'رقم الهاتف', fr: 'Téléphone', en: 'Phone' },
  priceEstimateNote: {
    ar: 'تقدير أولي — يتم احتساب السعر النهائي على الخادم عند التأكيد.',
    fr: 'Estimation — le prix final est calculé sur le serveur à la confirmation.',
    en: 'Estimate — the final price is computed on the server at confirmation.',
  },
  estTotal: { ar: 'الإجمالي التقديري', fr: 'Total estimé', en: 'Estimated total' },
  total: { ar: 'الإجمالي', fr: 'Total', en: 'Total' },
  extraGuestFee: { ar: 'رسوم ضيف إضافي', fr: 'Frais voyageur supplémentaire', en: 'Extra guest fee' },
  cleaningFee: { ar: 'رسوم التنظيف', fr: 'Frais de ménage', en: 'Cleaning fee' },
  serviceFee: { ar: 'رسوم الخدمة', fr: 'Frais de service', en: 'Service fee' },
  bookingFailed: { ar: 'تعذّر إتمام الحجز', fr: 'Échec de la réservation', en: 'Booking failed' },
  signInToBook: {
    ar: 'سجّل الدخول لإتمام الحجز',
    fr: 'Connectez-vous pour réserver',
    en: 'Sign in to complete your booking',
  },
  signIn: { ar: 'تسجيل الدخول', fr: 'Se connecter', en: 'Sign in' },
  selectDatesFirst: { ar: 'اختر التواريخ أولًا', fr: 'Choisissez d’abord les dates', en: 'Select dates first' },
  minNightsNote: { ar: 'حد أدنى', fr: 'min.', en: 'min' },
  nights: { ar: 'ليالٍ', fr: 'nuits', en: 'nights' },
  night: { ar: 'ليلة', fr: 'nuit', en: 'night' },

  // ── Payment stub ──────────────────────────────────────────────────────────
  paymentTitle: { ar: 'الدفع', fr: 'Paiement', en: 'Payment' },
  paymentNextStep: {
    ar: 'الخطوة التالية هي الدفع عبر Chargily.',
    fr: 'L’étape suivante est le paiement via Chargily.',
    en: 'The next step is payment via Chargily.',
  },
  payWith: { ar: 'الدفع عبر Edahabia / CIB', fr: 'Payer avec Edahabia / CIB', en: 'Pay with Edahabia/CIB' },
  sandboxPending: {
    ar: 'تكامل الدفع (Sandbox) قيد الإعداد.',
    fr: 'Intégration paiement (sandbox) à venir.',
    en: 'sandbox integration pending',
  },
  amountDue: { ar: 'المبلغ المستحق', fr: 'Montant dû', en: 'Amount due' },
  payByDeadline: { ar: 'أكمل الدفع قبل', fr: 'Payez avant le', en: 'Complete payment by' },
  requestSentTitle: { ar: 'تم إرسال الطلب', fr: 'Demande envoyée', en: 'Request sent' },
  requestSentBody: {
    ar: 'تم إرسال طلب الحجز إلى المضيف. سيتم إشعارك عند الرد.',
    fr: 'Votre demande a été envoyée à l’hôte. Vous serez notifié de sa réponse.',
    en: 'Your booking request was sent to the host. You’ll be notified of their response.',
  },
  awaitingPaymentTitle: { ar: 'بانتظار الدفع', fr: 'En attente de paiement', en: 'Awaiting payment' },
  awaitingPaymentBody: {
    ar: 'تم تأكيد التوفر. أكمل الدفع لتثبيت حجزك.',
    fr: 'Disponibilité confirmée. Finalisez le paiement pour valider votre réservation.',
    en: 'Availability confirmed. Complete payment to secure your booking.',
  },
  completePayment: { ar: 'إكمال الدفع', fr: 'Finaliser le paiement', en: 'Complete payment' },
  viewTrip: { ar: 'عرض الرحلة', fr: 'Voir le voyage', en: 'View trip' },
  backToExplore: { ar: 'العودة للاستكشاف', fr: 'Retour à l’exploration', en: 'Back to Explore' },
  bookingCode: { ar: 'رمز الحجز', fr: 'Code de réservation', en: 'Booking code' },

  // ── Trips ─────────────────────────────────────────────────────────────────
  tripsTitle: { ar: 'رحلاتي', fr: 'Mes voyages', en: 'Trips' },
  tabUpcoming: { ar: 'القادمة', fr: 'À venir', en: 'Upcoming' },
  tabCompleted: { ar: 'المكتملة', fr: 'Terminés', en: 'Completed' },
  tabCancelled: { ar: 'الملغاة', fr: 'Annulés', en: 'Cancelled' },
  tripsEmptyTitle: { ar: 'لا توجد رحلات بعد', fr: 'Aucun voyage', en: 'No trips yet' },
  tripsEmptyBody: {
    ar: 'عندما تحجز إقامة ستظهر هنا.',
    fr: 'Vos réservations apparaîtront ici.',
    en: 'Your booked stays will show up here.',
  },
  tripDetail: { ar: 'تفاصيل الرحلة', fr: 'Détails du voyage', en: 'Trip details' },
  signInToSeeTrips: {
    ar: 'سجّل الدخول لعرض رحلاتك.',
    fr: 'Connectez-vous pour voir vos voyages.',
    en: 'Sign in to see your trips.',
  },

  // ── Profile ───────────────────────────────────────────────────────────────
  profileTitle: { ar: 'ملفي', fr: 'Profil', en: 'Profile' },
  signedInAs: { ar: 'مسجّل الدخول باسم', fr: 'Connecté en tant que', en: 'Signed in as' },
  guest: { ar: 'زائر', fr: 'Invité', en: 'Guest' },
  notSignedIn: { ar: 'لم تسجّل الدخول', fr: 'Non connecté', en: 'Not signed in' },
  signOut: { ar: 'تسجيل الخروج', fr: 'Se déconnecter', en: 'Sign out' },
  signedOut: { ar: 'تم تسجيل الخروج', fr: 'Vous êtes déconnecté', en: 'You have been signed out' },
  switchToHosting: { ar: 'الانتقال إلى الاستضافة', fr: 'Passer en mode hôte', en: 'Switch to Hosting' },
  switchToTravelling: { ar: 'العودة إلى وضع السفر', fr: 'Revenir au voyage', en: 'Switch to Travelling' },
  hostSwitchFailed: {
    ar: 'تعذّر تفعيل وضع الاستضافة. تحقّق من اتصالك وحاول مجددًا.',
    fr: 'Impossible d’activer le mode hôte. Vérifiez votre connexion et réessayez.',
    en: 'Could not enable hosting. Check your connection and try again.',
  },
  language: { ar: 'اللغة', fr: 'Langue', en: 'Language' },
  myTrips: { ar: 'رحلاتي', fr: 'Mes voyages', en: 'My trips' },
  wishlists: { ar: 'المفضلة', fr: 'Favoris', en: 'Wishlists' },
  wishlistsSoon: { ar: 'قريبًا', fr: 'Bientôt', en: 'Coming soon' },

  // ── Reviews (write) ───────────────────────────────────────────────────────
  leaveReview: { ar: 'اكتب تقييمًا', fr: 'Laisser un avis', en: 'Leave a review' },
  rateYourStay: { ar: 'قيّم إقامتك', fr: 'Évaluez votre séjour', en: 'Rate your stay' },
  reviewIntro: {
    ar: 'شارك تجربتك لمساعدة الضيوف الآخرين والمضيف.',
    fr: 'Partagez votre expérience pour aider les autres voyageurs et l’hôte.',
    en: 'Share your experience to help other guests and the host.',
  },
  reviewComment: { ar: 'تعليقك (اختياري)', fr: 'Votre commentaire (facultatif)', en: 'Your comment (optional)' },
  reviewCommentHint: {
    ar: 'ما الذي أعجبك؟ بمَ تنصح الضيوف القادمين؟',
    fr: 'Qu’avez-vous aimé ? Que conseillez-vous aux prochains voyageurs ?',
    en: 'What did you like? Any tips for future guests?',
  },
  submitReview: { ar: 'إرسال التقييم', fr: 'Envoyer l’avis', en: 'Submit review' },
  reviewThanksTitle: { ar: 'شكرًا لتقييمك!', fr: 'Merci pour votre avis !', en: 'Thanks for your review!' },
  reviewThanksBody: {
    ar: 'تم نشر تقييمك. نقدّر مساهمتك في مجتمع ضيافة.',
    fr: 'Votre avis a été publié. Merci de contribuer à la communauté Dyafa.',
    en: 'Your review has been posted. Thanks for contributing to the Dyafa community.',
  },
  reviewFailed: { ar: 'تعذّر إرسال التقييم', fr: 'Échec de l’envoi de l’avis', en: 'Could not submit review' },
  reviewNotEligibleTitle: { ar: 'لا يمكن التقييم', fr: 'Avis indisponible', en: 'Review unavailable' },
  reviewNotEligibleBody: {
    ar: 'يمكن تقييم الإقامات المكتملة فقط، ومرة واحدة لكل حجز.',
    fr: 'Seuls les séjours terminés peuvent être évalués, une fois par réservation.',
    en: 'Only completed stays can be reviewed, once per booking.',
  },
  reviewSelectAll: {
    ar: 'يرجى تقييم كل الفئات.',
    fr: 'Veuillez noter toutes les catégories.',
    en: 'Please rate every category.',
  },
  alreadyReviewed: { ar: 'تم التقييم', fr: 'Déjà évalué', en: 'Reviewed' },
  hostReply: { ar: 'رد المضيف', fr: 'Réponse de l’hôte', en: 'Host reply' },
  reportReview: { ar: 'إبلاغ', fr: 'Signaler', en: 'Report' },
  reportReviewTitle: { ar: 'الإبلاغ عن تقييم', fr: 'Signaler un avis', en: 'Report review' },
  reportReviewHint: {
    ar: 'أخبرنا بسبب الإبلاغ عن هذا التقييم.',
    fr: 'Indiquez pourquoi vous signalez cet avis.',
    en: 'Tell us why you’re reporting this review.',
  },
  reportSubmit: { ar: 'إرسال البلاغ', fr: 'Envoyer le signalement', en: 'Submit report' },
  reportThanks: { ar: 'تم استلام بلاغك. شكرًا لك.', fr: 'Votre signalement a été reçu. Merci.', en: 'Your report was received. Thank you.' },
  reportFailed: { ar: 'تعذّر إرسال البلاغ', fr: 'Échec du signalement', en: 'Could not submit report' },

  // ── Host reviews ──────────────────────────────────────────────────────────
  hostReviewsTitle: { ar: 'تقييمات ضيوفي', fr: 'Avis des voyageurs', en: 'Guest reviews' },
  hostReviewsEmptyTitle: { ar: 'لا توجد تقييمات بعد', fr: 'Aucun avis', en: 'No reviews yet' },
  hostReviewsEmptyBody: {
    ar: 'ستظهر تقييمات ضيوفك هنا بعد انتهاء إقاماتهم.',
    fr: 'Les avis de vos voyageurs apparaîtront ici après leur séjour.',
    en: 'Your guests’ reviews will appear here after their stays.',
  },
  reply: { ar: 'رد', fr: 'Répondre', en: 'Reply' },
  replyPlaceholder: { ar: 'اكتب ردًا عامًا…', fr: 'Rédigez une réponse publique…', en: 'Write a public reply…' },
  replySubmit: { ar: 'نشر الرد', fr: 'Publier la réponse', en: 'Post reply' },
  replyFailed: { ar: 'تعذّر نشر الرد', fr: 'Échec de la publication', en: 'Could not post reply' },
  reviewsLink: { ar: 'التقييمات', fr: 'Avis', en: 'Reviews' },

  // ── Messaging ─────────────────────────────────────────────────────────────
  inbox: { ar: 'الرسائل', fr: 'Messages', en: 'Inbox' },
  messageHost: { ar: 'مراسلة المضيف', fr: 'Contacter l’hôte', en: 'Message host' },
  messages: { ar: 'الرسائل', fr: 'Messages', en: 'Messages' },
  inboxEmptyTitle: { ar: 'لا توجد رسائل', fr: 'Aucun message', en: 'No messages' },
  inboxEmptyBody: {
    ar: 'محادثاتك مع المضيفين والضيوف ستظهر هنا.',
    fr: 'Vos conversations avec les hôtes et voyageurs apparaîtront ici.',
    en: 'Your conversations with hosts and guests will show up here.',
  },
  signInToSeeInbox: {
    ar: 'سجّل الدخول لعرض رسائلك.',
    fr: 'Connectez-vous pour voir vos messages.',
    en: 'Sign in to see your messages.',
  },
  messagePlaceholder: { ar: 'اكتب رسالة…', fr: 'Écrire un message…', en: 'Write a message…' },
  send: { ar: 'إرسال', fr: 'Envoyer', en: 'Send' },
  noMessagesYet: {
    ar: 'لا توجد رسائل بعد. ابدأ المحادثة.',
    fr: 'Aucun message pour l’instant. Démarrez la conversation.',
    en: 'No messages yet. Start the conversation.',
  },
  messageFailed: { ar: 'تعذّر إرسال الرسالة', fr: 'Échec de l’envoi', en: 'Could not send message' },
  conversationFailed: { ar: 'تعذّر فتح المحادثة', fr: 'Impossible d’ouvrir la conversation', en: 'Could not open the conversation' },
  messageHostNeedsBooking: {
    ar: 'احجز هذه الإقامة لبدء محادثة مع المضيف.',
    fr: 'Réservez ce logement pour discuter avec l’hôte.',
    en: 'Book this stay to start a conversation with the host.',
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: { ar: 'الإشعارات', fr: 'Notifications', en: 'Notifications' },
  notificationsEmptyTitle: { ar: 'لا توجد إشعارات', fr: 'Aucune notification', en: 'No notifications' },
  notificationsEmptyBody: {
    ar: 'ستظهر التحديثات حول حجوزاتك ورسائلك وتقييماتك هنا.',
    fr: 'Les mises à jour sur vos réservations, messages et avis apparaîtront ici.',
    en: 'Updates about your bookings, messages and reviews will appear here.',
  },
  markAllRead: { ar: 'تحديد الكل كمقروء', fr: 'Tout marquer comme lu', en: 'Mark all read' },
  signInToSeeNotifications: {
    ar: 'سجّل الدخول لعرض الإشعارات.',
    fr: 'Connectez-vous pour voir vos notifications.',
    en: 'Sign in to see your notifications.',
  },

  // ── Booking status labels ─────────────────────────────────────────────────
  st_requested: { ar: 'بانتظار رد المضيف', fr: 'En attente de l’hôte', en: 'Requested' },
  st_declined: { ar: 'مرفوض', fr: 'Refusé', en: 'Declined' },
  st_awaiting_payment: { ar: 'بانتظار الدفع', fr: 'Paiement en attente', en: 'Awaiting payment' },
  st_confirmed: { ar: 'مؤكّد', fr: 'Confirmé', en: 'Confirmed' },
  st_checked_in: { ar: 'تم تسجيل الوصول', fr: 'Enregistré', en: 'Checked in' },
  st_completed: { ar: 'مكتمل', fr: 'Terminé', en: 'Completed' },
  st_cancelled: { ar: 'ملغى', fr: 'Annulé', en: 'Cancelled' },
  st_no_show: { ar: 'لم يحضر', fr: 'Absent', en: 'No-show' },
  st_expired: { ar: 'منتهٍ', fr: 'Expiré', en: 'Expired' },

  // ── Host dashboard (M4) ───────────────────────────────────────────────────
  hostHomeTitle: { ar: 'استضافتي', fr: 'Hébergement', en: 'Hosting' },
  hostDashboard: { ar: 'لوحة المضيف', fr: 'Tableau de bord', en: 'Host dashboard' },
  hostListings: { ar: 'إعلاناتي', fr: 'Mes annonces', en: 'Listings' },
  hostCreate: { ar: 'إنشاء إعلان', fr: 'Créer une annonce', en: 'Create listing' },
  hostReservations: { ar: 'الحجوزات', fr: 'Réservations', en: 'Reservations' },
  hostCalendarLink: { ar: 'التقويم والأسعار', fr: 'Calendrier & tarifs', en: 'Calendar & pricing' },
  hostEarnings: { ar: 'الأرباح', fr: 'Revenus', en: 'Earnings' },
  hostPerformanceLink: { ar: 'الأداء', fr: 'Performance', en: 'Performance' },
  hostStatActiveListings: { ar: 'إعلانات نشطة', fr: 'Annonces actives', en: 'Active listings' },
  hostStatPendingRequests: { ar: 'طلبات معلّقة', fr: 'Demandes en attente', en: 'Pending requests' },

  // ── Host reservations ─────────────────────────────────────────────────────
  hostReservationsTitle: { ar: 'الحجوزات', fr: 'Réservations', en: 'Reservations' },
  hostTabRequests: { ar: 'الطلبات', fr: 'Demandes', en: 'Requests' },
  hostTabUpcoming: { ar: 'القادمة', fr: 'À venir', en: 'Upcoming' },
  hostGuest: { ar: 'الضيف', fr: 'Voyageur', en: 'Guest' },
  hostGuests: { ar: 'الضيوف', fr: 'Voyageurs', en: 'Guests' },
  hostNights: { ar: 'ليالٍ', fr: 'nuits', en: 'nights' },
  hostPayout: { ar: 'صافي الأرباح', fr: 'Revenu net', en: 'Your payout' },
  hostAccept: { ar: 'قبول', fr: 'Accepter', en: 'Accept' },
  hostDecline: { ar: 'رفض', fr: 'Refuser', en: 'Decline' },
  hostAcceptFailed: { ar: 'تعذّر قبول الطلب', fr: 'Échec de l’acceptation', en: 'Could not accept request' },
  hostDeclineFailed: { ar: 'تعذّر رفض الطلب', fr: 'Échec du refus', en: 'Could not decline request' },
  hostNoShow: { ar: 'لم يحضر', fr: 'Absence', en: 'No-show' },
  hostCheckInFailed: { ar: 'تعذّر تسجيل الوصول', fr: 'Échec de l’enregistrement de l’arrivée', en: 'Could not check in' },
  hostCheckOutFailed: { ar: 'تعذّر تسجيل المغادرة', fr: 'Échec de l’enregistrement du départ', en: 'Could not check out' },
  hostNoShowFailed: { ar: 'تعذّر تحديد عدم الحضور', fr: 'Échec', en: 'Could not mark no-show' },
  hostNoShowTitle: { ar: 'تحديد كعدم حضور؟', fr: 'Marquer comme absence ?', en: 'Mark as no-show?' },
  hostNoShowBody: {
    ar: 'سيتم تحديد هذا الحجز كعدم حضور. لا يمكن التراجع.',
    fr: 'Cette réservation sera marquée comme absence. Action irréversible.',
    en: 'This booking will be marked as a no-show. This cannot be undone.',
  },
  hostNoShowConfirm: { ar: 'تأكيد', fr: 'Confirmer', en: 'Confirm no-show' },
  hostRequestsEmptyTitle: { ar: 'لا توجد طلبات جديدة', fr: 'Aucune demande', en: 'No new requests' },
  hostRequestsEmptyBody: {
    ar: 'ستظهر طلبات الحجز الجديدة هنا لتقبلها أو ترفضها.',
    fr: 'Les nouvelles demandes apparaîtront ici pour acceptation ou refus.',
    en: 'New booking requests will appear here for you to accept or decline.',
  },
  hostUpcomingEmptyTitle: { ar: 'لا توجد إقامات قادمة', fr: 'Aucun séjour à venir', en: 'No upcoming stays' },
  hostUpcomingEmptyBody: {
    ar: 'الحجوزات المؤكّدة ستظهر هنا.',
    fr: 'Vos réservations confirmées apparaîtront ici.',
    en: 'Your confirmed bookings will appear here.',
  },
  hostMessageGuest: { ar: 'مراسلة الضيف', fr: 'Contacter le voyageur', en: 'Message guest' },

  // ── Host calendar ─────────────────────────────────────────────────────────
  hostCalendarTitle: { ar: 'التقويم والأسعار', fr: 'Calendrier & tarifs', en: 'Calendar & pricing' },
  hostPickListing: { ar: 'اختر الإعلان', fr: 'Choisir l’annonce', en: 'Choose a listing' },
  hostPickRoomType: { ar: 'اختر نوع الغرفة', fr: 'Choisir le type de chambre', en: 'Choose a room type' },
  hostSelectRange: {
    ar: 'حدّد نطاق تواريخ لتعديل التوفر أو السعر.',
    fr: 'Sélectionnez une plage de dates pour modifier la disponibilité ou le prix.',
    en: 'Select a date range to edit availability or pricing.',
  },
  hostRangeSelected: { ar: 'النطاق المحدّد', fr: 'Plage sélectionnée', en: 'Selected range' },
  hostBlock: { ar: 'إغلاق التواريخ', fr: 'Bloquer', en: 'Block dates' },
  hostUnblock: { ar: 'فتح التواريخ', fr: 'Débloquer', en: 'Open dates' },
  hostPriceOverride: { ar: 'سعر مخصّص لليلة (دج)', fr: 'Prix personnalisé / nuit (DZD)', en: 'Price override / night (DZD)' },
  hostMinStay: { ar: 'الحد الأدنى للإقامة (ليالٍ)', fr: 'Séjour minimum (nuits)', en: 'Minimum stay (nights)' },
  hostApplyChanges: { ar: 'تطبيق', fr: 'Appliquer', en: 'Apply' },
  hostClearRange: { ar: 'إلغاء التحديد', fr: 'Annuler', en: 'Clear selection' },
  hostClosed: { ar: 'مغلق', fr: 'Fermé', en: 'Closed' },
  hostLegendClosed: { ar: 'مغلق', fr: 'Fermé', en: 'Closed' },
  hostLegendOverride: { ar: 'سعر مخصّص', fr: 'Prix spécial', en: 'Custom price' },
  hostCalendarApplied: { ar: 'تم تحديث التواريخ', fr: 'Dates mises à jour', en: 'Dates updated' },
  hostCalendarFailed: { ar: 'تعذّر تحديث التواريخ', fr: 'Échec de la mise à jour', en: 'Could not update dates' },
  hostNoRoomTypes: { ar: 'لا توجد غرف لهذا الإعلان بعد.', fr: 'Aucune chambre pour cette annonce.', en: 'No room types for this listing yet.' },
  hostKeepCurrent: { ar: 'دون تغيير', fr: 'Inchangé', en: 'Leave unchanged' },
  hostNoListingsTitle: { ar: 'لا توجد إعلانات', fr: 'Aucune annonce', en: 'No listings' },
  hostNoListingsBody: {
    ar: 'أنشئ إعلانًا أولًا لإدارة تقويمه وأسعاره.',
    fr: 'Créez d’abord une annonce pour gérer son calendrier et ses tarifs.',
    en: 'Create a listing first to manage its calendar and pricing.',
  },

  // ── Host earnings ─────────────────────────────────────────────────────────
  hostEarningsTitle: { ar: 'الأرباح', fr: 'Revenus', en: 'Earnings' },
  hostEarnUpcoming: { ar: 'مدفوعات قادمة', fr: 'À venir', en: 'Upcoming' },
  hostEarnPaid: { ar: 'مدفوعة', fr: 'Versés', en: 'Paid' },
  hostPayouts: { ar: 'الدفعات', fr: 'Versements', en: 'Payouts' },
  hostPerBooking: { ar: 'حسب الحجز', fr: 'Par réservation', en: 'Per booking' },
  hostGross: { ar: 'الإجمالي', fr: 'Brut', en: 'Gross' },
  hostCommission: { ar: 'العمولة', fr: 'Commission', en: 'Commission' },
  hostNet: { ar: 'الصافي', fr: 'Net', en: 'Net' },
  hostPeriod: { ar: 'الفترة', fr: 'Période', en: 'Period' },
  hostPayoutsEmptyTitle: { ar: 'لا توجد دفعات بعد', fr: 'Aucun versement', en: 'No payouts yet' },
  hostPayoutsEmptyBody: {
    ar: 'ستظهر دفعاتك هنا بعد اكتمال إقامات ضيوفك.',
    fr: 'Vos versements apparaîtront ici après les séjours de vos voyageurs.',
    en: 'Your payouts will appear here after your guests’ stays complete.',
  },
  hostEarnBookingsEmptyTitle: { ar: 'لا توجد أرباح بعد', fr: 'Aucun revenu', en: 'No earnings yet' },
  hostEarnBookingsEmptyBody: {
    ar: 'تظهر تفاصيل الأرباح لكل حجز مؤكّد أو مكتمل.',
    fr: 'Le détail des revenus s’affiche par réservation confirmée ou terminée.',
    en: 'Earnings details appear per confirmed or completed booking.',
  },
  hostEarningsNote: {
    ar: 'الأرقام نهائية من الخادم بعد خصم العمولة.',
    fr: 'Montants finalisés par le serveur, commission déduite.',
    en: 'Figures are server-finalized, net of commission.',
  },
  payoutPending: { ar: 'قيد الانتظار', fr: 'En attente', en: 'Pending' },
  payoutProcessing: { ar: 'قيد المعالجة', fr: 'En cours', en: 'Processing' },
  payoutPaid: { ar: 'مدفوعة', fr: 'Versé', en: 'Paid' },
  payoutFailed: { ar: 'فشلت', fr: 'Échec', en: 'Failed' },
  payoutOnHold: { ar: 'مُعلّقة', fr: 'En suspens', en: 'On hold' },

  // ── Host performance ──────────────────────────────────────────────────────
  hostPerformanceTitle: { ar: 'الأداء', fr: 'Performance', en: 'Performance' },
  hostMetricListings: { ar: 'الإعلانات', fr: 'Annonces', en: 'Listings' },
  hostMetricBookings: { ar: 'إجمالي الحجوزات', fr: 'Réservations', en: 'Total bookings' },
  hostMetricConfirmed: { ar: 'مؤكّدة', fr: 'Confirmées', en: 'Confirmed' },
  hostMetricCompleted: { ar: 'مكتملة', fr: 'Terminées', en: 'Completed' },
  hostMetricOccupancy: { ar: 'الإشغال (٣٠ يومًا)', fr: 'Occupation (30 j)', en: 'Occupancy (30 days)' },
  hostMetricRevenue: { ar: 'الإيرادات', fr: 'Revenus', en: 'Revenue' },
  hostMetricViews: { ar: 'المشاهدات', fr: 'Vues', en: 'Views' },
  hostViewsNote: {
    ar: 'تتبّع المشاهدات غير متاح حاليًا.',
    fr: 'Le suivi des vues n’est pas encore disponible.',
    en: 'View tracking isn’t available yet.',
  },
  hostOccupancyNote: {
    ar: 'تقدير: الليالي المحجوزة ÷ الليالي المتاحة خلال ٣٠ يومًا.',
    fr: 'Estimation : nuits réservées ÷ nuits disponibles sur 30 jours.',
    en: 'Estimate: booked nights ÷ available nights over 30 days.',
  },
  hostPerfEmptyTitle: { ar: 'لا توجد بيانات بعد', fr: 'Aucune donnée', en: 'No data yet' },
  hostPerfEmptyBody: {
    ar: 'انشر إعلانًا واستقبل حجوزًا لرؤية أدائك.',
    fr: 'Publiez une annonce et recevez des réservations pour voir vos performances.',
    en: 'Publish a listing and take bookings to see your performance.',
  },

  // ── Host shell / dashboard (Phase 3) ──────────────────────────────────────
  hostNewHostTitle: { ar: 'مرحبًا بك كمضيف', fr: 'Bienvenue, hôte', en: 'Welcome, host' },
  hostNewHostBody: {
    ar: 'أنشئ أول إعلان لك لتبدأ استقبال الحجوزات.',
    fr: 'Créez votre première annonce pour commencer à recevoir des réservations.',
    en: 'Create your first listing to start taking bookings.',
  },
  hostClaimRefreshing: {
    ar: 'جارٍ تجهيز حساب الاستضافة…',
    fr: 'Préparation de votre compte hôte…',
    en: 'Setting up your host account…',
  },
  hostManage: { ar: 'الإدارة', fr: 'Gérer', en: 'Manage' },

  // ── Host reservations: awaiting payment + decline reason (Phase 3) ─────────
  hostTabAwaiting: { ar: 'بانتظار الدفع', fr: 'Paiement attendu', en: 'Awaiting payment' },
  hostAwaitingEmptyTitle: { ar: 'لا شيء بانتظار الدفع', fr: 'Rien en attente de paiement', en: 'Nothing awaiting payment' },
  hostAwaitingEmptyBody: {
    ar: 'الحجوزات التي قبلتها وتنتظر دفع الضيف ستظهر هنا.',
    fr: 'Les réservations acceptées en attente de paiement du voyageur apparaîtront ici.',
    en: 'Bookings you accepted that are awaiting the guest’s payment appear here.',
  },
  hostPayBy: { ar: 'موعد الدفع', fr: 'Paiement avant', en: 'Pay by' },
  hostDeclineTitle: { ar: 'رفض الطلب؟', fr: 'Refuser la demande ?', en: 'Decline request?' },
  hostDeclineReasonHint: {
    ar: 'سبب الرفض (اختياري) — يُرسَل للضيف.',
    fr: 'Motif du refus (facultatif) — partagé avec le voyageur.',
    en: 'Reason for declining (optional) — shared with the guest.',
  },
  hostDeclineConfirm: { ar: 'تأكيد الرفض', fr: 'Confirmer le refus', en: 'Confirm decline' },
  cancel: { ar: 'إلغاء', fr: 'Annuler', en: 'Cancel' },

  // ── Host check-in/out (placeholder — RPC pending) ─────────────────────────
  hostCheckIn: { ar: 'تسجيل الوصول', fr: 'Enregistrer l’arrivée', en: 'Check in' },
  hostCheckOut: { ar: 'تسجيل المغادرة', fr: 'Enregistrer le départ', en: 'Check out' },

  // ── Host cancel confirmed booking + refund preview (Phase 3) ──────────────
  hostCancelBooking: { ar: 'إلغاء الحجز', fr: 'Annuler la réservation', en: 'Cancel booking' },
  hostCancelTitle: { ar: 'إلغاء هذا الحجز؟', fr: 'Annuler cette réservation ?', en: 'Cancel this booking?' },
  hostCancelReasonHint: {
    ar: 'سبب الإلغاء — يُرسَل للضيف.',
    fr: 'Motif de l’annulation — partagé avec le voyageur.',
    en: 'Reason for cancelling — shared with the guest.',
  },
  hostRefundPreview: { ar: 'سيُسترد للضيف', fr: 'Remboursé au voyageur', en: 'Guest will be refunded' },
  hostCancelConfirm: { ar: 'تأكيد الإلغاء', fr: 'Confirmer l’annulation', en: 'Confirm cancellation' },
  hostCancelFailed: { ar: 'تعذّر إلغاء الحجز', fr: 'Échec de l’annulation', en: 'Could not cancel booking' },
  hostCancelDone: { ar: 'تم إلغاء الحجز', fr: 'Réservation annulée', en: 'Booking cancelled' },

  // ── Host calendar extras (Phase 3) ────────────────────────────────────────
  hostClearOverride: { ar: 'مسح التخصيص', fr: 'Effacer le réglage', en: 'Clear override' },
  hostLegendBooked: { ar: 'محجوز', fr: 'Réservé', en: 'Booked' },
  hostLegendAvailable: { ar: 'متاح', fr: 'Disponible', en: 'Available' },
  hostBookingsOverlayNote: {
    ar: 'الأيام المحجوزة مميّزة؛ لا يمكن فتحها من هنا.',
    fr: 'Les jours réservés sont marqués ; ils ne peuvent pas être ouverts ici.',
    en: 'Booked days are marked and can’t be opened here.',
  },
  hostDraftListingNote: {
    ar: 'هذا الإعلان مسودة — انشره ليصبح قابلًا للحجز.',
    fr: 'Cette annonce est un brouillon — publiez-la pour la rendre réservable.',
    en: 'This listing is a draft — publish it to make it bookable.',
  },

  // ── Host reviews: filter + aggregate (Phase 3) ────────────────────────────
  hostReviewsAll: { ar: 'الكل', fr: 'Tous', en: 'All' },
  hostReviewsUnreplied: { ar: 'بلا رد', fr: 'Sans réponse', en: 'Unreplied' },
  hostReviewsAverage: { ar: 'المتوسط', fr: 'Moyenne', en: 'Average' },
  hostReviewsTotal: { ar: 'إجمالي التقييمات', fr: 'Total des avis', en: 'Total reviews' },
  hostReviewsUnrepliedEmptyTitle: { ar: 'لا توجد تقييمات بلا رد', fr: 'Aucun avis sans réponse', en: 'No unreplied reviews' },
  hostReviewsUnrepliedEmptyBody: {
    ar: 'رددت على كل تقييماتك. أحسنت!',
    fr: 'Vous avez répondu à tous vos avis. Bravo !',
    en: 'You’ve replied to every review. Nice!',
  },

  // ── Wizard extras (Phase 3) ───────────────────────────────────────────────
  wizardSearchWilaya: { ar: 'ابحث عن ولاية…', fr: 'Rechercher une wilaya…', en: 'Search a wilaya…' },
  wizardNoWilaya: { ar: 'لا توجد نتائج', fr: 'Aucun résultat', en: 'No matches' },
  wizardDiscardTitle: { ar: 'تجاهل المسودة؟', fr: 'Abandonner le brouillon ?', en: 'Discard draft?' },
  wizardDiscardBody: {
    ar: 'سيُحفظ تقدّمك تلقائيًا. هل تريد المتابعة لاحقًا أم التجاهل؟',
    fr: 'Votre progression est enregistrée. Continuer plus tard ou abandonner ?',
    en: 'Your progress is saved automatically. Continue later or discard?',
  },
  wizardSaveExit: { ar: 'حفظ والخروج', fr: 'Enregistrer et quitter', en: 'Save & exit' },
  wizardDiscard: { ar: 'تجاهل', fr: 'Abandonner', en: 'Discard' },
  wizardKeepEditing: { ar: 'متابعة التعديل', fr: 'Continuer', en: 'Keep editing' },

  // ── Amenity category headings (DB slugs → localized) ──────────────────────
  amCatEssentials: { ar: 'الأساسيات', fr: 'Essentiels', en: 'Essentials' },
  amCatFeatures: { ar: 'المميزات', fr: 'Caractéristiques', en: 'Features' },
  amCatSafety: { ar: 'السلامة', fr: 'Sécurité', en: 'Safety' },
  amCatLocation: { ar: 'الموقع', fr: 'Emplacement', en: 'Location' },
  amCatAccessibility: { ar: 'إمكانية الوصول', fr: 'Accessibilité', en: 'Accessibility' },
  amCatKitchen: { ar: 'المطبخ', fr: 'Cuisine', en: 'Kitchen' },
  amCatBathroom: { ar: 'الحمام', fr: 'Salle de bain', en: 'Bathroom' },
  amCatOutdoor: { ar: 'في الخارج', fr: 'Extérieur', en: 'Outdoor' },
  amCatEntertainment: { ar: 'الترفيه', fr: 'Divertissement', en: 'Entertainment' },
  amCatOther: { ar: 'أخرى', fr: 'Autres', en: 'Other' },

  // ── Phase 4: search / detail / checkout / pay extras ──────────────────────
  // Search entry
  recentSearches: { ar: 'عمليات بحث حديثة', fr: 'Recherches récentes', en: 'Recent searches' },
  popularDestinations: { ar: 'وجهات شائعة', fr: 'Destinations populaires', en: 'Popular destinations' },
  anyGuests: { ar: 'أي عدد من الضيوف', fr: "N'importe quel nombre", en: 'Any guests' },
  searchNoMatches: { ar: 'لا توجد ولاية مطابقة', fr: 'Aucune wilaya correspondante', en: 'No matching wilaya' },
  searchWilayaPlaceholder: { ar: 'ابحث عن ولاية…', fr: 'Rechercher une wilaya…', en: 'Search a wilaya…' },
  // Sort sheet
  sortBy: { ar: 'ترتيب حسب', fr: 'Trier par', en: 'Sort by' },
  // Filters
  showNStays: { ar: 'عرض الإقامات', fr: 'Voir les logements', en: 'Show stays' },
  priceRangeInvalid: {
    ar: 'الحد الأدنى يجب ألا يتجاوز الحد الأعلى.',
    fr: 'Le minimum ne doit pas dépasser le maximum.',
    en: 'Min price must be ≤ max price.',
  },
  noMatchingStays: { ar: 'لا توجد إقامات مطابقة', fr: 'Aucun logement', en: 'No matching stays' },
  // Detail
  langFallbackNote: {
    ar: 'يُعرض هذا المحتوى بلغة أخرى (غير متوفّر بالعربية).',
    fr: 'Contenu affiché dans une autre langue (non disponible en français).',
    en: 'Shown in another language (not available in your language).',
  },
  reserve: { ar: 'احجز', fr: 'Réserver', en: 'Reserve' },
  occupancyMax: { ar: 'الحد الأقصى لعدد الضيوف', fr: 'Capacité maximale', en: 'Max capacity' },
  // Checkout
  quantity: { ar: 'عدد الوحدات', fr: 'Nombre d’unités', en: 'Number of units' },
  units: { ar: 'وحدات', fr: 'unités', en: 'units' },
  unit: { ar: 'وحدة', fr: 'unité', en: 'unit' },
  contactName: { ar: 'الاسم الكامل', fr: 'Nom complet', en: 'Full name' },
  contactPhone: { ar: 'رقم الهاتف', fr: 'Téléphone', en: 'Phone (+213…)' },
  phoneInvalid: {
    ar: 'أدخل رقم هاتف جزائري صالح (+213).',
    fr: 'Entrez un numéro algérien valide (+213).',
    en: 'Enter a valid Algerian phone number (+213).',
  },
  minNightsError: {
    ar: 'الحد الأدنى للإقامة',
    fr: 'Séjour minimum',
    en: 'Minimum stay',
  },
  bookingCreatedReadFailed: {
    ar: 'تم إنشاء حجزك. جارٍ فتح التفاصيل…',
    fr: 'Votre réservation est créée. Ouverture des détails…',
    en: 'Your booking was created. Opening details…',
  },
  // Pay
  payChoosePaymentMethod: { ar: 'اختر طريقة الدفع', fr: 'Choisir le mode de paiement', en: 'Choose payment method' },
  payMethodEdahabia: { ar: 'الذهبية', fr: 'Edahabia', en: 'Edahabia' },
  payMethodCib: { ar: 'CIB', fr: 'CIB', en: 'CIB' },
  payMethodBaridiQr: { ar: 'بريدي موب (QR)', fr: 'BaridiMob (QR)', en: 'BaridiMob (QR)' },
  payOpenCheckout: { ar: 'أكمل الدفع في المتصفح…', fr: 'Terminez le paiement dans le navigateur…', en: 'Complete payment in the browser…' },
  payWaitingConfirm: { ar: 'بانتظار تأكيد الدفع…', fr: 'En attente de la confirmation…', en: 'Waiting for payment confirmation…' },
  payRefreshStatus: { ar: 'تحديث حالة الدفع', fr: 'Actualiser le statut', en: 'Refresh payment status' },
  payConfirmedTitle: { ar: 'تم تأكيد الدفع', fr: 'Paiement confirmé', en: 'Payment confirmed' },
  payExpiredTitle: { ar: 'انتهت مهلة الدفع', fr: 'Délai de paiement expiré', en: 'Payment window expired' },
  payExpiredBody: {
    ar: 'انتهت مهلة الدفع لهذا الحجز. ابدأ حجزًا جديدًا.',
    fr: 'Le délai de paiement de cette réservation a expiré. Réservez à nouveau.',
    en: 'The payment window for this booking has expired. Please book again.',
  },
  payTimeLeft: { ar: 'الوقت المتبقي', fr: 'Temps restant', en: 'Time left' },
  paySimulateDev: { ar: 'محاكاة دفع ناجح (تطوير)', fr: 'Simuler un paiement (dev)', en: 'Simulate payment (dev)' },
  paySimulateDevNote: {
    ar: 'وضع التطوير: يؤكّد الحجز دون شارجيلي.',
    fr: 'Mode dev : confirme la réservation sans Chargily.',
    en: 'Dev mode: confirms the booking without Chargily.',
  },
  payAlreadyConfirmed: {
    ar: 'تم تأكيد هذا الحجز بالفعل.',
    fr: 'Cette réservation est déjà confirmée.',
    en: 'This booking is already confirmed.',
  },
  // Auth
  forgotPassword: { ar: 'نسيت كلمة المرور؟', fr: 'Mot de passe oublié ?', en: 'Forgot password?' },
  resetPasswordSent: {
    ar: 'إذا كان البريد مسجّلًا، أرسلنا رابط إعادة التعيين.',
    fr: 'Si l’adresse existe, un lien de réinitialisation a été envoyé.',
    en: 'If that email exists, we sent a reset link.',
  },
  resendEmail: { ar: 'إعادة إرسال البريد', fr: 'Renvoyer l’e-mail', en: 'Resend email' },
  resendEmailSent: { ar: 'تمت إعادة الإرسال.', fr: 'E-mail renvoyé.', en: 'Email resent.' },
  authErrorRateLimit: {
    ar: 'محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.',
    fr: 'Trop de tentatives. Patientez un instant et réessayez.',
    en: 'Too many attempts. Please wait a moment and try again.',
  },
  authErrorUnconfirmed: {
    ar: 'لم يتم تأكيد بريدك بعد. تحقق من صندوق الوارد.',
    fr: 'Votre e-mail n’est pas encore confirmé. Vérifiez votre boîte.',
    en: 'Your email isn’t confirmed yet. Check your inbox.',
  },
  authErrorInvalid: {
    ar: 'بريد إلكتروني أو كلمة مرور غير صحيحة.',
    fr: 'E-mail ou mot de passe incorrect.',
    en: 'Incorrect email or password.',
  },
  authEmailLabel: { ar: 'البريد الإلكتروني', fr: 'E-mail', en: 'Email' },
  resetPasswordTitle: { ar: 'إعادة تعيين كلمة المرور', fr: 'Réinitialiser le mot de passe', en: 'Reset your password' },
  resetPasswordBody: {
    ar: 'أدخل بريدك وسنرسل لك رابطًا لإعادة التعيين.',
    fr: 'Entrez votre e-mail et nous vous enverrons un lien de réinitialisation.',
    en: 'Enter your email and we’ll send you a reset link.',
  },
  sendResetLink: { ar: 'إرسال الرابط', fr: 'Envoyer le lien', en: 'Send reset link' },
  authSignInCta: { ar: 'تسجيل الدخول', fr: 'Se connecter', en: 'Sign in' },

  // ── Cancellation tier labels + refund windows (policy/review) ─────────────
  tierFlexibleLabel: { ar: 'مرنة', fr: 'Flexible', en: 'Flexible' },
  tierModerateLabel: { ar: 'متوسطة', fr: 'Modérée', en: 'Moderate' },
  tierStrictLabel: { ar: 'صارمة', fr: 'Stricte', en: 'Strict' },
  tierFlexibleWindow: {
    ar: 'استرداد كامل حتى 24 ساعة قبل الوصول.',
    fr: 'Remboursement intégral jusqu’à 24 h avant l’arrivée.',
    en: 'Full refund up to 24h before check-in.',
  },
  tierModerateWindow: {
    ar: 'استرداد كامل حتى 5 أيام قبل الوصول.',
    fr: 'Remboursement intégral jusqu’à 5 jours avant l’arrivée.',
    en: 'Full refund up to 5 days before check-in.',
  },
  tierStrictWindow: {
    ar: 'استرداد 50% حتى 7 أيام قبل الوصول، ثم لا استرداد.',
    fr: 'Remboursement de 50 % jusqu’à 7 jours avant, puis aucun.',
    en: '50% refund up to 7 days before, none after.',
  },
} as const satisfies Record<string, LMessage>;

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
  switchToHosting: { ar: 'الانتقال إلى الاستضافة', fr: 'Passer en mode hôte', en: 'Switch to Hosting' },
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
} as const satisfies Record<string, LMessage>;

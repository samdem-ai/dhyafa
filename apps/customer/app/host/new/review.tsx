/**
 * Wizard step 9 — review & submit.
 *
 * On submit:
 *  1. ensure the draft property exists,
 *  2. persist the final property columns (policy + min_nights),
 *  3. reconcile room types (single_unit → exactly one is_default room;
 *     multi_room → insert any rooms not yet persisted),
 *  4. sync amenities,
 *  5. call submit_property_for_review RPC (server re-checks title/room/photo),
 *  6. show a success confirmation.
 *
 * The server is the source of truth for completeness; we mirror its checks
 * locally to give the host a clear summary before submitting.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PartyPopper } from 'lucide-react-native';
import { formatDZD, type Locale } from '@dyafa/i18n';
import {
  addRoomType,
  listRoomTypes,
  listPhotos,
  setAmenities,
  submitForReview,
  updateProperty,
  updateRoomType,
  type PropertyPhotoRow,
} from '@/lib/listings';
import { useWizard, type RoomTypeDraft } from '@/lib/wizard';
import { Text, Button, Skeleton, EmptyState, StatusPill, haptics } from '@/ui';
import { cancellationTierCopy, pick as pickL } from '@/lib/copy';
import { WizardChrome } from '@/components/WizardChrome';
import { theme } from '@/theme';

const COPY = {
  title: { ar: 'المراجعة والإرسال', fr: 'Vérifier et envoyer', en: 'Review & submit' },
  subtitle: {
    ar: 'تأكّد من التفاصيل قبل إرسال إعلانك للمراجعة.',
    fr: 'Vérifiez les détails avant d’envoyer pour révision.',
    en: 'Confirm the details before submitting for review.',
  },
  submit: { ar: 'إرسال للمراجعة', fr: 'Envoyer pour révision', en: 'Submit for review' },
  sectionTitle: { ar: 'العنوان', fr: 'Titre', en: 'Title' },
  sectionPhotos: { ar: 'الصور', fr: 'Photos', en: 'Photos' },
  sectionRooms: { ar: 'الغرف والأسعار', fr: 'Chambres et prix', en: 'Rooms & pricing' },
  sectionAmenities: { ar: 'المرافق', fr: 'Équipements', en: 'Amenities' },
  sectionPolicy: { ar: 'السياسة', fr: 'Politique', en: 'Policy' },
  photosCount: { ar: 'صور', fr: 'photos', en: 'photos' },
  amenitiesCount: { ar: 'مرافق مختارة', fr: 'équipements', en: 'amenities' },
  perNight: { ar: '/ ليلة', fr: '/ nuit', en: '/ night' },
  missing: { ar: 'ناقص', fr: 'Manquant', en: 'Missing' },
  ok: { ar: 'مكتمل', fr: 'OK', en: 'OK' },
  checklist: {
    ar: 'المتطلبات: عنوان بلغة واحدة على الأقل، غرفة واحدة على الأقل، صورة واحدة على الأقل.',
    fr: 'Requis : un titre (1 langue), au moins une chambre, au moins une photo.',
    en: 'Required: a title in 1 language, at least one room, at least one photo.',
  },
  submitError: {
    ar: 'تعذّر الإرسال. تحقق من المتطلبات وحاول مجددًا.',
    fr: 'Échec de l’envoi. Vérifiez les exigences et réessayez.',
    en: 'Submit failed. Check the requirements and try again.',
  },
  successTitle: { ar: 'تم الإرسال للمراجعة!', fr: 'Envoyé pour révision !', en: 'Submitted for review!' },
  successBody: {
    ar: 'سنراجع إعلانك قريبًا وستصلك إشعار عند الموافقة.',
    fr: 'Nous examinerons votre annonce et vous notifierons.',
    en: 'We’ll review your listing shortly and notify you once approved.',
  },
  backToListings: { ar: 'العودة إلى إعلاناتي', fr: 'Retour à mes annonces', en: 'Back to my listings' },
  cancellation: { ar: 'الإلغاء', fr: 'Annulation', en: 'Cancellation' },
  instantOn: { ar: 'حجز فوري مُفعّل', fr: 'Réservation instantanée', en: 'Instant book on' },
  instantOff: { ar: 'بالطلب', fr: 'Sur demande', en: 'Request to book' },
  minNights: { ar: 'حد أدنى', fr: 'min.', en: 'min' },
  nights: { ar: 'ليالٍ', fr: 'nuits', en: 'nights' },
  untitled: { ar: '(بدون عنوان)', fr: '(sans titre)', en: '(untitled)' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

function toInt(v: string): number {
  const n = parseInt(v.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function bestTitle(draft: ReturnType<typeof useWizard>['draft'], locale: Locale): string {
  const chain =
    locale === 'fr'
      ? [draft.titleFr, draft.titleAr, draft.titleEn]
      : locale === 'en'
        ? [draft.titleEn, draft.titleFr, draft.titleAr]
        : [draft.titleAr, draft.titleFr, draft.titleEn];
  return chain.find((t) => t.trim() !== '')?.trim() ?? '';
}

export default function StepReview() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { draft, ensureDraft, setRooms, reset } = useWizard();

  const [photos, setPhotos] = useState<PropertyPhotoRow[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const loadPhotos = useCallback(async () => {
    try {
      // Read-only: don't create a draft just by visiting review.
      if (!draft.propertyId) {
        setPhotos([]);
        return;
      }
      setPhotos(await listPhotos(draft.propertyId));
    } catch {
      setPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.propertyId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  const title = bestTitle(draft, locale);
  const photoCount = photos?.length ?? 0;
  const hasTitle = title !== '';
  const hasRoom = draft.rooms.some((r) => toInt(r.basePriceDzd) > 0 && toInt(r.maxOccupancy) > 0);
  const hasPhoto = photoCount > 0;
  const canSubmit = hasTitle && hasRoom && hasPhoto && !submitting;

  /**
   * Reconcile room types idempotently. We write each inserted room's DB id back
   * into the wizard draft so a retried submit (e.g. after a transient failure)
   * takes the UPDATE path instead of duplicating room_types. For single_unit we
   * additionally adopt any pre-existing default row so re-entry never piles up.
   */
  async function persistRooms(propertyId: string): Promise<void> {
    const isSingle = draft.listingKind === 'single_unit';
    const existing = await listRoomTypes(propertyId);
    // Work on a local copy so we can stamp ids and push back once at the end.
    const next: RoomTypeDraft[] = draft.rooms.map((r) => ({ ...r }));

    if (isSingle) {
      const room = next[0];
      if (!room) return;
      const payload = {
        nameAr: room.nameAr.trim() || null,
        nameFr: room.nameFr.trim() || null,
        nameEn: room.nameEn.trim() || null,
        isDefault: true,
        maxOccupancy: toInt(room.maxOccupancy),
        baseOccupancy: toInt(room.maxOccupancy),
        basePriceDzd: toInt(room.basePriceDzd),
        weekendPriceDzd: room.weekendPriceDzd.trim() ? toInt(room.weekendPriceDzd) : null,
        cleaningFeeDzd: toInt(room.cleaningFeeDzd),
        inventoryCount: 1,
      };
      // Prefer the room's own persisted id, then any existing default row.
      const currentId =
        room.id ?? (existing.find((r) => r.is_default) ?? existing[0])?.id;
      if (currentId) {
        await updateRoomType(currentId, {
          name_ar: payload.nameAr,
          name_fr: payload.nameFr,
          name_en: payload.nameEn,
          is_default: true,
          max_occupancy: payload.maxOccupancy,
          base_occupancy: payload.baseOccupancy,
          base_price_dzd: payload.basePriceDzd,
          weekend_price_dzd: payload.weekendPriceDzd,
          cleaning_fee_dzd: payload.cleaningFeeDzd,
          inventory_count: 1,
        });
        room.id = currentId;
      } else {
        room.id = await addRoomType({ propertyId, ...payload });
      }
      setRooms(next);
      return;
    }

    // multi_room: persist any room not yet saved; update those already saved.
    for (const [idx, room] of next.entries()) {
      const payload = {
        nameAr: room.nameAr.trim() || null,
        nameFr: room.nameFr.trim() || null,
        nameEn: room.nameEn.trim() || null,
        isDefault: idx === 0,
        maxOccupancy: toInt(room.maxOccupancy),
        baseOccupancy: toInt(room.maxOccupancy),
        basePriceDzd: toInt(room.basePriceDzd),
        weekendPriceDzd: room.weekendPriceDzd.trim() ? toInt(room.weekendPriceDzd) : null,
        cleaningFeeDzd: toInt(room.cleaningFeeDzd),
        inventoryCount: Math.max(1, toInt(room.inventoryCount)),
      };
      if (room.id) {
        await updateRoomType(room.id, {
          name_ar: payload.nameAr,
          name_fr: payload.nameFr,
          name_en: payload.nameEn,
          is_default: payload.isDefault,
          max_occupancy: payload.maxOccupancy,
          base_occupancy: payload.baseOccupancy,
          base_price_dzd: payload.basePriceDzd,
          weekend_price_dzd: payload.weekendPriceDzd,
          cleaning_fee_dzd: payload.cleaningFeeDzd,
          inventory_count: payload.inventoryCount,
        });
      } else {
        // Stamp the new id back so a retry updates instead of re-inserting.
        room.id = await addRoomType({ propertyId, ...payload });
      }
    }
    setRooms(next);
  }

  async function onSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const propertyId = await ensureDraft();

      // Final property columns (policy step values).
      await updateProperty(propertyId, {
        cancellation_tier: draft.cancellationTier,
        instant_book: draft.instantBook,
        min_nights: Math.max(1, toInt(draft.minNights)),
      });

      await persistRooms(propertyId);
      await setAmenities(propertyId, draft.amenityIds);
      await submitForReview(propertyId);

      haptics.success();
      setDone(true);
    } catch {
      setError(pick(COPY.submitError, locale));
    } finally {
      setSubmitting(false);
    }
  }

  /** Clear the draft (memory + storage) then return to the dashboard. */
  async function onFinish() {
    await reset();
    router.replace('/host');
  }

  if (done) {
    return (
      <SafeAreaView style={styles.successWrap}>
        <EmptyState
          icon={PartyPopper}
          title={pick(COPY.successTitle, locale)}
          subtitle={pick(COPY.successBody, locale)}
        />
        <View style={styles.successAction}>
          <Button
            label={pick(COPY.backToListings, locale)}
            onPress={() => void onFinish()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const cheapest = draft.rooms
    .map((r) => toInt(r.basePriceDzd))
    .filter((p) => p > 0)
    .sort((a, b) => a - b)[0];

  return (
    <WizardChrome
      locale={locale}
      step={9}
      title={pick(COPY.title, locale)}
      subtitle={pick(COPY.subtitle, locale)}
      nextLabel={pick(COPY.submit, locale)}
      nextDisabled={!canSubmit}
      nextLoading={submitting}
      onNext={() => void onSubmit()}
    >
      <View style={styles.sections}>
        {/* Title */}
        <Section
          label={pick(COPY.sectionTitle, locale)}
          ok={hasTitle}
          okLabel={pick(hasTitle ? COPY.ok : COPY.missing, locale)}
        >
          <Text variant="body">{title || pick(COPY.untitled, locale)}</Text>
        </Section>

        {/* Photos */}
        <Section
          label={pick(COPY.sectionPhotos, locale)}
          ok={hasPhoto}
          okLabel={pick(hasPhoto ? COPY.ok : COPY.missing, locale)}
        >
          {photos === null ? (
            <Skeleton style={styles.lineSkeleton} />
          ) : (
            <Text variant="body">
              {photoCount} {pick(COPY.photosCount, locale)}
            </Text>
          )}
        </Section>

        {/* Rooms */}
        <Section
          label={pick(COPY.sectionRooms, locale)}
          ok={hasRoom}
          okLabel={pick(hasRoom ? COPY.ok : COPY.missing, locale)}
        >
          {draft.rooms.map((r: RoomTypeDraft, idx) => {
            const price = toInt(r.basePriceDzd);
            const name =
              r.nameAr || r.nameFr || r.nameEn || `${pick(COPY.sectionRooms, locale)} ${idx + 1}`;
            return (
              <Text key={r.key} variant="body">
                {draft.listingKind === 'multi_room' ? `${name} — ` : ''}
                <Text variant="body" weight="bold" color="accent">
                  {formatDZD(price, locale)}
                </Text>{' '}
                {pick(COPY.perNight, locale)}
              </Text>
            );
          })}
        </Section>

        {/* Amenities */}
        <Section label={pick(COPY.sectionAmenities, locale)}>
          <Text variant="body">
            {draft.amenityIds.length} {pick(COPY.amenitiesCount, locale)}
          </Text>
        </Section>

        {/* Policy */}
        <Section label={pick(COPY.sectionPolicy, locale)}>
          <Text variant="body">
            {pick(COPY.cancellation, locale)}:{' '}
            {pickL(cancellationTierCopy(draft.cancellationTier).label, locale)} ·{' '}
            {draft.instantBook ? pick(COPY.instantOn, locale) : pick(COPY.instantOff, locale)} ·{' '}
            {pick(COPY.minNights, locale)} {Math.max(1, toInt(draft.minNights))}{' '}
            {pick(COPY.nights, locale)}
          </Text>
          <Text variant="body-sm" color="textMuted">
            {pickL(cancellationTierCopy(draft.cancellationTier).window, locale)}
          </Text>
          {cheapest ? (
            <Text variant="title" weight="bold" color="accent" style={styles.fromPrice}>
              {formatDZD(cheapest, locale)} {pick(COPY.perNight, locale)}
            </Text>
          ) : null}
        </Section>

        {!canSubmit ? (
          <View style={styles.checklist}>
            <Text variant="body-sm" color="textMuted">
              {pick(COPY.checklist, locale)}
            </Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.notice}>
            <Text variant="body-sm" weight="medium" color="error" center>
              {error}
            </Text>
          </View>
        ) : null}
      </View>
    </WizardChrome>
  );
}

function Section({
  label,
  ok,
  okLabel,
  children,
}: {
  label: string;
  ok?: boolean;
  okLabel?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="title" weight="bold" style={styles.flex}>
          {label}
        </Text>
        {okLabel ? <StatusPill label={okLabel} tone={ok ? 'success' : 'warning'} /> : null}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sections: { gap: theme.space.xl },
  section: {
    gap: theme.space.sm,
    paddingBottom: theme.space.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  sectionBody: { gap: theme.space.xs },
  fromPrice: { marginTop: theme.space.xs },
  lineSkeleton: { height: 16, width: '40%', borderRadius: theme.radius.sm },
  checklist: {
    backgroundColor: theme.color.surfaceSunken,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
  },
  notice: {
    backgroundColor: theme.color.errorBg,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
  },
  successWrap: { flex: 1, backgroundColor: theme.color.bg, justifyContent: 'center' },
  successAction: {
    paddingHorizontal: theme.space.xl,
    paddingBottom: theme.space['3xl'],
  },
});

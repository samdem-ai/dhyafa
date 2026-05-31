/**
 * Wizard step 7 — pricing / room types.
 *
 * single_unit: one auto-created default room type (no name needed) — base price,
 *   optional weekend price, cleaning fee, max occupancy.
 * multi_room: a list of room types the host can add/remove, each with a name,
 *   occupancy, price, and inventory count.
 *
 * Room types are NOT persisted here — they're held in the wizard draft and
 * written on the review step (so the host can freely edit before submitting).
 * We validate that every room has a positive base price + occupancy.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { useWizard, emptyRoom, type RoomTypeDraft } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { TextField, Card } from '@/components/fields';
import { FieldLabel } from '@/components/ui';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const COPY = {
  titleSingle: { ar: 'التسعير', fr: 'Tarification', en: 'Pricing' },
  titleMulti: { ar: 'الغرف والتسعير', fr: 'Chambres et tarifs', en: 'Rooms & pricing' },
  subSingle: {
    ar: 'حدّد السعر لليلة الواحدة. يمكنك تعديله لاحقًا.',
    fr: 'Définissez le prix par nuit. Modifiable plus tard.',
    en: 'Set the nightly price. You can change it later.',
  },
  subMulti: {
    ar: 'أضف أنواع الغرف التي تؤجّرها بأسعارها.',
    fr: 'Ajoutez les types de chambres et leurs tarifs.',
    en: 'Add the room types you rent and their prices.',
  },
  roomName: { ar: 'اسم الغرفة', fr: 'Nom de la chambre', en: 'Room name' },
  roomNamePh: { ar: 'مثال: غرفة مزدوجة', fr: 'Ex. : Chambre double', en: 'e.g. Double room' },
  maxOcc: { ar: 'السعة القصوى', fr: 'Capacité max', en: 'Max occupancy' },
  basePrice: { ar: 'السعر / ليلة (دج)', fr: 'Prix / nuit (DZD)', en: 'Price / night (DZD)' },
  weekend: { ar: 'سعر نهاية الأسبوع (اختياري)', fr: 'Prix week-end (option.)', en: 'Weekend price (optional)' },
  cleaning: { ar: 'رسوم التنظيف (دج)', fr: 'Frais de ménage (DZD)', en: 'Cleaning fee (DZD)' },
  inventory: { ar: 'عدد الوحدات', fr: 'Nombre d’unités', en: 'Number of units' },
  addRoom: { ar: '＋ إضافة نوع غرفة', fr: '＋ Ajouter une chambre', en: '＋ Add room type' },
  remove: { ar: 'حذف', fr: 'Supprimer', en: 'Remove' },
  roomN: { ar: 'غرفة', fr: 'Chambre', en: 'Room' },
  needPrice: {
    ar: 'أدخل سعرًا صحيحًا وسعة لكل غرفة.',
    fr: 'Saisissez un prix et une capacité valides pour chaque chambre.',
    en: 'Enter a valid price and occupancy for every room.',
  },
  preview: { ar: 'المعاينة:', fr: 'Aperçu :', en: 'Preview:' },
  perNight: { ar: '/ ليلة', fr: '/ nuit', en: '/ night' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

function toInt(v: string): number {
  const n = parseInt(v.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function roomValid(r: RoomTypeDraft): boolean {
  return toInt(r.basePriceDzd) > 0 && toInt(r.maxOccupancy) > 0 && toInt(r.inventoryCount) > 0;
}

export default function StepPricing() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const { draft, setRooms } = useWizard();
  const [touched, setTouched] = useState(false);

  const isSingle = draft.listingKind === 'single_unit';
  const rooms = draft.rooms.length > 0 ? draft.rooms : [emptyRoom(true)];

  function updateRoom(idx: number, patch: Partial<RoomTypeDraft>) {
    setRooms(rooms.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRoom() {
    setRooms([...rooms, emptyRoom(false)]);
  }
  function removeRoom(idx: number) {
    if (rooms.length <= 1) return;
    setRooms(rooms.filter((_, i) => i !== idx));
  }

  const allValid = rooms.every(roomValid);

  function onNext() {
    if (!allValid) {
      setTouched(true);
      return;
    }
    router.push('/host/new/policy');
  }

  return (
    <WizardChrome
      locale={locale}
      step={7}
      title={pick(isSingle ? COPY.titleSingle : COPY.titleMulti, locale)}
      subtitle={pick(isSingle ? COPY.subSingle : COPY.subMulti, locale)}
      nextDisabled={!allValid}
      onNext={onNext}
    >
      {rooms.map((room, idx) => {
        const price = toInt(room.basePriceDzd);
        return (
          <Card key={room.key}>
            {!isSingle && (
              <View style={styles.roomHeader}>
                <Text style={styles.roomHeaderText}>
                  {pick(COPY.roomN, locale)} {idx + 1}
                </Text>
                {rooms.length > 1 ? (
                  <Pressable onPress={() => removeRoom(idx)} hitSlop={6}>
                    <Text style={styles.removeText}>{pick(COPY.remove, locale)}</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {!isSingle && (
              <TextField
                label={pick(COPY.roomName, locale)}
                value={room.nameAr || room.nameFr || room.nameEn}
                onChangeText={(t) => updateRoom(idx, { nameAr: t })}
                placeholder={pick(COPY.roomNamePh, locale)}
              />
            )}

            <View style={styles.row}>
              <View style={styles.col}>
                <TextField
                  label={pick(COPY.basePrice, locale)}
                  value={room.basePriceDzd}
                  onChangeText={(t) => updateRoom(idx, { basePriceDzd: t })}
                  placeholder="8000"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label={pick(COPY.maxOcc, locale)}
                  value={room.maxOccupancy}
                  onChangeText={(t) => updateRoom(idx, { maxOccupancy: t })}
                  placeholder="2"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <TextField
                  label={pick(COPY.weekend, locale)}
                  value={room.weekendPriceDzd}
                  onChangeText={(t) => updateRoom(idx, { weekendPriceDzd: t })}
                  placeholder="10000"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.col}>
                <TextField
                  label={pick(COPY.cleaning, locale)}
                  value={room.cleaningFeeDzd}
                  onChangeText={(t) => updateRoom(idx, { cleaningFeeDzd: t })}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {!isSingle && (
              <TextField
                label={pick(COPY.inventory, locale)}
                value={room.inventoryCount}
                onChangeText={(t) => updateRoom(idx, { inventoryCount: t })}
                placeholder="1"
                keyboardType="number-pad"
              />
            )}

            {price > 0 ? (
              <Text style={styles.preview}>
                {pick(COPY.preview, locale)}{' '}
                <Text style={styles.previewPrice}>{formatDZD(price, locale)}</Text>{' '}
                {pick(COPY.perNight, locale)}
              </Text>
            ) : null}
          </Card>
        );
      })}

      {!isSingle ? (
        <Pressable accessibilityRole="button" onPress={addRoom} style={styles.addBtn}>
          <Text style={styles.addText}>{pick(COPY.addRoom, locale)}</Text>
        </Pressable>
      ) : null}

      {touched && !allValid ? (
        <Text style={styles.error}>{pick(COPY.needPrice, locale)}</Text>
      ) : null}
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomHeaderText: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
  },
  removeText: {
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
  },
  row: { flexDirection: 'row', gap: theme.space.md },
  col: { flex: 1 },
  preview: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  previewPrice: {
    fontFamily: RN_FONTS.bodyBold,
    color: theme.color.accent,
    fontWeight: '700',
  },
  addBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.color.borderStrong,
    borderRadius: theme.radius.card,
    paddingVertical: theme.space.lg,
    alignItems: 'center',
  },
  addText: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    color: theme.color.primary,
    fontWeight: '600',
  },
  error: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
    backgroundColor: theme.color.errorBg,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    textAlign: 'center',
  },
});

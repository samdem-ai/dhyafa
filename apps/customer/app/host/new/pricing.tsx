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
import { View, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react-native';
import { formatDZD, formatNumber, type Locale } from '@dyafa/i18n';
import { useWizard, emptyRoom, type RoomTypeDraft } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { TextField, FieldLabel, SegmentedControl, Text } from '@/ui';
import { theme } from '@/theme';

/** ar/fr/en locale options for the shared room-name tabs. */
const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

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
  addRoom: { ar: 'إضافة نوع غرفة', fr: 'Ajouter une chambre', en: 'Add room type' },
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

/**
 * Parse a user-typed amount to a whole number. Strips spaces + thousands
 * separators (',' '.' '٬' ' ') used as grouping, keeps a single decimal point,
 * then floors. So '8 000' → 8000, '8,000' → 8000, and '8.5' → 8 (NOT 85, the
 * old strip-all-non-digits bug).
 */
function toInt(v: string): number {
  if (!v) return 0;
  // Normalize Arabic-Indic digits to Latin.
  const latin = v.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  // Remove grouping separators (spaces, commas, Arabic thousands sep), keep '.'.
  const cleaned = latin.replace(/[\s,٬]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

/** Display a typed amount with locale thousands grouping (or '' when empty/0). */
function formatThousands(v: string, locale: Locale): string {
  const n = toInt(v);
  return n > 0 ? formatNumber(n, locale) : '';
}

function roomValid(r: RoomTypeDraft): boolean {
  return toInt(r.basePriceDzd) > 0 && toInt(r.maxOccupancy) > 0 && toInt(r.inventoryCount) > 0;
}

export default function StepPricing() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { draft, setRooms } = useWizard();
  const [touched, setTouched] = useState(false);
  // Which locale the room-name field edits (shared across rooms).
  const [nameTab, setNameTab] = useState<Locale>(locale);

  const isSingle = draft.listingKind === 'single_unit';
  const rooms = draft.rooms.length > 0 ? draft.rooms : [emptyRoom(true)];

  function updateRoom(idx: number, patch: Partial<RoomTypeDraft>) {
    setRooms(rooms.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function roomNameFor(r: RoomTypeDraft, l: Locale): string {
    return l === 'ar' ? r.nameAr : l === 'fr' ? r.nameFr : r.nameEn;
  }
  function setRoomName(idx: number, l: Locale, t: string) {
    if (l === 'ar') updateRoom(idx, { nameAr: t });
    else if (l === 'fr') updateRoom(idx, { nameFr: t });
    else updateRoom(idx, { nameEn: t });
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
          <View key={room.key} style={styles.room}>
            {!isSingle && (
              <View style={styles.roomHeader}>
                <Text variant="title" weight="bold">
                  {pick(COPY.roomN, locale)} {formatNumber(idx + 1, locale)}
                </Text>
                {rooms.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={pick(COPY.remove, locale)}
                    onPress={() => removeRoom(idx)}
                    hitSlop={6}
                    style={styles.removeBtn}
                  >
                    <Trash2 size={15} color={theme.color.error} strokeWidth={2} />
                    <Text variant="body-sm" weight="semibold" color="error">
                      {pick(COPY.remove, locale)}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            {!isSingle && (
              <View style={styles.nameField}>
                <FieldLabel label={pick(COPY.roomName, locale)} />
                <SegmentedControl
                  options={LOCALE_OPTIONS}
                  value={nameTab}
                  onChange={setNameTab}
                />
                <TextField
                  value={roomNameFor(room, nameTab)}
                  onChangeText={(t) => setRoomName(idx, nameTab, t)}
                  placeholder={pick(COPY.roomNamePh, locale)}
                />
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.col}>
                <TextField
                  label={pick(COPY.basePrice, locale)}
                  hint={formatThousands(room.basePriceDzd, locale) || undefined}
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
              <Text variant="body-sm" color="textMuted">
                {pick(COPY.preview, locale)}{' '}
                <Text variant="body-sm" weight="bold" color="accent">
                  {formatDZD(price, locale)}
                </Text>{' '}
                {pick(COPY.perNight, locale)}
              </Text>
            ) : null}
          </View>
        );
      })}

      {!isSingle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(COPY.addRoom, locale)}
          onPress={addRoom}
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        >
          <Plus size={18} color={theme.color.accent} strokeWidth={2} />
          <Text variant="body" weight="semibold" color="accent">
            {pick(COPY.addRoom, locale)}
          </Text>
        </Pressable>
      ) : null}

      {touched && !allValid ? (
        <View style={styles.notice}>
          <Text variant="body-sm" weight="medium" color="error" center>
            {pick(COPY.needPrice, locale)}
          </Text>
        </View>
      ) : null}
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  room: { gap: theme.space.md },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  nameField: { gap: theme.space.sm },
  row: { flexDirection: 'row', gap: theme.space.md },
  col: { flex: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.space.md,
  },
  addBtnPressed: { opacity: 0.85 },
  notice: {
    backgroundColor: theme.color.errorBg,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
  },
});

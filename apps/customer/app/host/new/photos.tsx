/**
 * Wizard step 3 — photos.
 *
 * Multi-select from the library (expo-image-picker), upload to the
 * `listing-photos` bucket under ${hostProfileId}/${propertyId}/… (storage RLS
 * requires path[1] = my_host_id()), preview with expo-image, reorder (move
 * left/right), and choose a cover. At least one photo is required to continue
 * (also enforced server-side on submit).
 *
 * We do NOT create a draft property merely by visiting this step — the draft is
 * created lazily on the first upload (ensureDraft) so abandoning the wizard here
 * never orphans an empty server-side draft.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, I18nManager } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { getMyHostProfileId } from '@/lib/listings';
import { pickListingImages } from '@/lib/imagePicker';
import {
  uploadPhoto,
  listPhotos,
  deletePhoto,
  reorderPhotos,
  photoPublicUrl,
  type PropertyPhotoRow,
} from '@/lib/listings';
import { useWizard } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { Text, Skeleton, ErrorState, haptics } from '@/ui';
import { ChevronLeft, ChevronRight, Star, X, Plus } from 'lucide-react-native';
import { theme } from '@/theme';

const COPY = {
  title: { ar: 'أضف صورًا', fr: 'Ajoutez des photos', en: 'Add photos' },
  subtitle: {
    ar: 'الصور الجيدة تزيد الحجوزات. أضف صورة واحدة على الأقل، وحدّد صورة الغلاف.',
    fr: 'De bonnes photos augmentent les réservations. Au moins une ; choisissez la couverture.',
    en: 'Great photos boost bookings. Add at least one and pick a cover.',
  },
  add: { ar: 'إضافة صور', fr: 'Ajouter', en: 'Add photos' },
  cover: { ar: 'الغلاف', fr: 'Couverture', en: 'Cover' },
  makeCover: { ar: 'اجعلها الغلاف', fr: 'Définir couverture', en: 'Set as cover' },
  remove: { ar: 'إزالة الصورة', fr: 'Supprimer la photo', en: 'Remove photo' },
  moveEarlier: { ar: 'نقل إلى الأمام', fr: 'Déplacer avant', en: 'Move earlier' },
  moveLater: { ar: 'نقل إلى الخلف', fr: 'Déplacer après', en: 'Move later' },
  permission: {
    ar: 'نحتاج إذن الوصول إلى الصور. فعّله من إعدادات النظام.',
    fr: "Autorisation d'accès aux photos requise. Activez-la dans les réglages.",
    en: 'Photo library permission is required. Enable it in system settings.',
  },
  unavailable: {
    ar: 'منتقي الصور غير متوفر على هذا الجهاز.',
    fr: "Le sélecteur d'images n'est pas disponible.",
    en: 'Image picker is not available on this device.',
  },
  authError: {
    ar: 'تعذّر تجهيز حساب الاستضافة. أعد المحاولة.',
    fr: "Impossible de préparer le compte hôte. Réessayez.",
    en: 'Could not prepare your host account. Try again.',
  },
  uploadError: {
    ar: 'تعذّر رفع الصورة. تحقّق من اتصالك.',
    fr: "Échec de l'envoi. Vérifiez votre connexion.",
    en: 'Upload failed. Check your connection.',
  },
  loadError: { ar: 'تعذّر تحميل الصور.', fr: 'Échec du chargement.', en: 'Failed to load photos.' },
  retry: { ar: 'إعادة المحاولة', fr: 'Réessayer', en: 'Retry' },
  needOne: {
    ar: 'أضف صورة واحدة على الأقل للمتابعة.',
    fr: 'Ajoutez au moins une photo pour continuer.',
    en: 'Add at least one photo to continue.',
  },
  count: { ar: 'صور', fr: 'photos', en: 'photos' },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

export default function StepPhotos() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { draft, ensureDraft } = useWizard();

  const [photos, setPhotos] = useState<PropertyPhotoRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Do NOT ensureDraft here — only read existing photos if a draft exists.
      if (!draft.propertyId) {
        setPhotos([]);
        return;
      }
      setPhotos(await listPhotos(draft.propertyId));
    } catch {
      setError(pick(COPY.loadError, locale));
      setPhotos([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd() {
    setActionError(null);
    const picked = await pickListingImages();
    if (!picked.ok) {
      if (picked.reason === 'denied') setActionError(pick(COPY.permission, locale));
      else if (picked.reason === 'unavailable') setActionError(pick(COPY.unavailable, locale));
      else if (picked.reason === 'error') setActionError(pick(COPY.uploadError, locale));
      // 'canceled' → silent
      return;
    }

    setBusy(true);
    try {
      // Lazily create the draft + host_id claim only now (first upload).
      let propertyId: string;
      try {
        propertyId = draft.propertyId ?? (await ensureDraft());
      } catch (e) {
        if (__DEV__) console.warn('[photos] ensureDraft failed:', e);
        setActionError(pick(COPY.authError, locale));
        return;
      }
      const hostProfileId = draft.hostProfileId ?? (await getMyHostProfileId());
      if (!hostProfileId) {
        setActionError(pick(COPY.authError, locale));
        return;
      }

      let current = photos ?? [];
      for (const image of picked.images) {
        const newPhoto = await uploadPhoto({
          hostProfileId,
          propertyId,
          base64: image.base64,
          ext: image.ext,
          contentType: image.mimeType,
          isCover: current.length === 0,
          sortOrder: current.length,
        });
        current = [...current, newPhoto];
        setPhotos(current);
      }
      haptics.success();
    } catch (e) {
      if (__DEV__) console.warn('[photos] upload failed:', e);
      const detail = e instanceof Error && e.message ? e.message : '';
      setActionError(pick(COPY.uploadError, locale) + (detail ? `\n(${detail})` : ''));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(photo: PropertyPhotoRow) {
    setActionError(null);
    const prev = photos ?? [];
    const next = prev.filter((p) => p.id !== photo.id);
    // Promote a new cover if we removed the cover.
    if (photo.is_cover && next[0]) next[0] = { ...next[0], is_cover: true };
    setPhotos(next);
    haptics.selection();
    try {
      await deletePhoto(photo);
      if (next.length > 0) await reorderPhotos(next, coverIdOf(next));
    } catch {
      setActionError(pick(COPY.uploadError, locale));
      setPhotos(prev); // rollback
    }
  }

  async function persistOrder(next: PropertyPhotoRow[], coverId: string) {
    const prev = photos ?? [];
    setPhotos(next);
    haptics.selection();
    try {
      await reorderPhotos(next, coverId);
    } catch {
      setActionError(pick(COPY.uploadError, locale));
      setPhotos(prev);
    }
  }

  function move(idx: number, dir: -1 | 1) {
    const arr = [...(photos ?? [])];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    const a = arr[idx];
    const b = arr[target];
    if (!a || !b) return;
    arr[idx] = b;
    arr[target] = a;
    void persistOrder(arr, coverIdOf(arr));
  }

  function makeCover(photo: PropertyPhotoRow) {
    const arr = (photos ?? []).map((p) => ({ ...p, is_cover: p.id === photo.id }));
    void persistOrder(arr, photo.id);
  }

  if (photos === null) {
    return (
      <View style={styles.fill}>
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} style={styles.skeletonTile} />
          ))}
        </View>
      </View>
    );
  }
  if (error && photos.length === 0) {
    return (
      <View style={styles.errorFill}>
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(COPY.retry, locale)} />
      </View>
    );
  }

  return (
    <WizardChrome
      locale={locale}
      step={3}
      title={pick(COPY.title, locale)}
      subtitle={pick(COPY.subtitle, locale)}
      nextDisabled={photos.length === 0}
      onNext={() => router.push('/host/new/details')}
    >
      {photos.length > 0 ? (
        <Text variant="body-sm" color="textMuted">
          {photos.length} {pick(COPY.count, locale)}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {photos.map((p, idx) => {
          const isCover = p.is_cover || (idx === 0 && !photos.some((x) => x.is_cover));
          return (
            <View key={p.id} style={styles.tile}>
              <Image
                source={{ uri: photoPublicUrl(p.storage_path) }}
                style={styles.tileImg}
                contentFit="cover"
                transition={150}
              />

              {isCover ? (
                <View style={styles.coverBadge}>
                  <Star size={11} color={theme.color.textOnPrimary} fill={theme.color.textOnPrimary} />
                  <Text variant="caption" weight="semibold" color="textOnPrimary">
                    {pick(COPY.cover, locale)}
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={pick(COPY.makeCover, locale)}
                  onPress={() => makeCover(p)}
                  style={styles.makeCoverBtn}
                  hitSlop={8}
                >
                  <Star size={14} color={theme.color.white} />
                </Pressable>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={pick(COPY.remove, locale)}
                onPress={() => void onRemove(p)}
                style={styles.removeBtn}
                hitSlop={8}
              >
                <X size={14} color={theme.color.white} />
              </Pressable>

              {/* Reorder controls */}
              <View style={styles.reorderRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={pick(COPY.moveEarlier, locale)}
                  accessibilityState={{ disabled: idx === 0 }}
                  disabled={idx === 0}
                  onPress={() => move(idx, -1)}
                  style={[styles.reorderBtn, idx === 0 && styles.reorderBtnDisabled]}
                  hitSlop={10}
                >
                  <ChevronLeft
                    size={16}
                    color={theme.color.white}
                    style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={pick(COPY.moveLater, locale)}
                  accessibilityState={{ disabled: idx === photos.length - 1 }}
                  disabled={idx === photos.length - 1}
                  onPress={() => move(idx, 1)}
                  style={[styles.reorderBtn, idx === photos.length - 1 && styles.reorderBtnDisabled]}
                  hitSlop={10}
                >
                  <ChevronRight
                    size={16}
                    color={theme.color.white}
                    style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(COPY.add, locale)}
          onPress={() => void onAdd()}
          disabled={busy}
          style={({ pressed }) => [styles.addTile, pressed && styles.addTilePressed]}
        >
          {busy ? (
            <ActivityIndicator color={theme.color.accent} />
          ) : (
            <>
              <View style={styles.addIcon}>
                <Plus size={24} color={theme.color.accent} strokeWidth={2} />
              </View>
              <Text variant="body-sm" weight="semibold" color="accent" center>
                {pick(COPY.add, locale)}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {photos.length === 0 ? (
        <Text variant="body-sm" color="textMuted">
          {pick(COPY.needOne, locale)}
        </Text>
      ) : null}
      {actionError ? (
        <View style={styles.notice}>
          <Text variant="body-sm" weight="medium" color="error" center>
            {actionError}
          </Text>
        </View>
      ) : null}
    </WizardChrome>
  );
}

/** The id of the cover photo (explicit flag, else the first photo). */
function coverIdOf(arr: PropertyPhotoRow[]): string {
  return (arr.find((p) => p.is_cover) ?? arr[0])?.id ?? '';
}

const TILE = '47%';

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.bg },
  errorFill: { flex: 1, backgroundColor: theme.color.bg, justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  tile: {
    width: TILE,
    aspectRatio: 1,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.color.surfaceSunken,
  },
  tileImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    top: theme.space.sm,
    start: theme.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.color.accent,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  makeCoverBtn: {
    position: 'absolute',
    top: theme.space.sm,
    start: theme.space.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.color.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: theme.space.sm,
    end: theme.space.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.color.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderRow: {
    position: 'absolute',
    bottom: theme.space.sm,
    start: theme.space.sm,
    end: theme.space.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reorderBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.color.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBtnDisabled: { opacity: 0.3 },
  addTile: {
    width: TILE,
    aspectRatio: 1,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.color.surfaceSunken,
    paddingHorizontal: theme.space.sm,
  },
  addTilePressed: { opacity: 0.85 },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.xs,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
    padding: theme.space.xl,
  },
  skeletonTile: { width: TILE, aspectRatio: 1, borderRadius: theme.radius.lg },
  notice: {
    backgroundColor: theme.color.errorBg,
    padding: theme.space.lg,
    borderRadius: theme.radius.card,
  },
});

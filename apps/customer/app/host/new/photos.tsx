/**
 * Wizard step 3 — photos. Pick from the library (expo-image-picker), upload to
 * the `listing-photos` bucket under ${userId}/${propertyId}/…, and show a grid.
 * At least one photo is required to continue (also enforced server-side on submit).
 * The first photo is marked as the cover.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { supabase } from '@/lib/auth';
import { pickListingImage } from '@/lib/imagePicker';
import {
  uploadPhoto,
  listPhotos,
  deletePhoto,
  photoPublicUrl,
  type PropertyPhotoRow,
} from '@/lib/listings';
import { useWizard } from '@/lib/wizard';
import { WizardChrome } from '@/components/WizardChrome';
import { Skeleton, ErrorState } from '@/components/ui';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const COPY = {
  title: { ar: 'أضف صورًا', fr: 'Ajoutez des photos', en: 'Add photos' },
  subtitle: {
    ar: 'الصور الجيدة تزيد الحجوزات. أضف صورة واحدة على الأقل.',
    fr: 'De bonnes photos augmentent les réservations. Au moins une.',
    en: 'Great photos boost bookings. Add at least one.',
  },
  add: { ar: '＋ إضافة صورة', fr: '＋ Ajouter', en: '＋ Add photo' },
  cover: { ar: 'الغلاف', fr: 'Couverture', en: 'Cover' },
  permission: {
    ar: 'نحتاج إذن الوصول إلى الصور.',
    fr: "Autorisation d'accès aux photos requise.",
    en: 'Photo library permission is required.',
  },
  unavailable: {
    ar: 'منتقي الصور غير متوفر على هذا الجهاز.',
    fr: "Le sélecteur d'images n'est pas disponible.",
    en: 'Image picker is not available on this device.',
  },
  uploadError: { ar: 'تعذّر رفع الصورة.', fr: "Échec de l'envoi.", en: 'Upload failed.' },
  loadError: { ar: 'تعذّر تحميل الصور.', fr: 'Échec du chargement.', en: 'Failed to load photos.' },
  retry: { ar: 'إعادة المحاولة', fr: 'Réessayer', en: 'Retry' },
  needOne: {
    ar: 'أضف صورة واحدة على الأقل للمتابعة.',
    fr: 'Ajoutez au moins une photo pour continuer.',
    en: 'Add at least one photo to continue.',
  },
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
      const id = draft.propertyId ?? (await ensureDraft());
      setPhotos(await listPhotos(id));
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
    const picked = await pickListingImage();
    if (!picked.ok) {
      if (picked.reason === 'denied') setActionError(pick(COPY.permission, locale));
      else if (picked.reason === 'unavailable') setActionError(pick(COPY.unavailable, locale));
      else if (picked.reason === 'error') setActionError(pick(COPY.uploadError, locale));
      // 'canceled' → silent
      return;
    }

    setBusy(true);
    try {
      const propertyId = draft.propertyId ?? (await ensureDraft());
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('NO_USER');

      const existing = photos ?? [];
      const newPhoto = await uploadPhoto({
        userId,
        propertyId,
        base64: picked.image.base64,
        ext: picked.image.ext,
        contentType: picked.image.mimeType,
        isCover: existing.length === 0,
        sortOrder: existing.length,
      });
      setPhotos([...existing, newPhoto]);
    } catch {
      setActionError(pick(COPY.uploadError, locale));
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(photo: PropertyPhotoRow) {
    setActionError(null);
    const prev = photos ?? [];
    setPhotos(prev.filter((p) => p.id !== photo.id));
    try {
      await deletePhoto(photo);
    } catch {
      setActionError(pick(COPY.uploadError, locale));
      setPhotos(prev); // rollback
    }
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
      <View style={styles.fill}>
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
      <View style={styles.grid}>
        {photos.map((p, idx) => (
          <View key={p.id} style={styles.tile}>
            <Image source={{ uri: photoPublicUrl(p.storage_path) }} style={styles.tileImg} />
            {idx === 0 || p.is_cover ? (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>{pick(COPY.cover, locale)}</Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => void onRemove(p)}
              style={styles.removeBtn}
              hitSlop={6}
            >
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => void onAdd()}
          disabled={busy}
          style={styles.addTile}
        >
          {busy ? (
            <ActivityIndicator color={theme.color.primary} />
          ) : (
            <Text style={styles.addText}>{pick(COPY.add, locale)}</Text>
          )}
        </Pressable>
      </View>

      {photos.length === 0 ? (
        <Text style={styles.hint}>{pick(COPY.needOne, locale)}</Text>
      ) : null}
      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
    </WizardChrome>
  );
}

const TILE = '47%';

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md },
  tile: {
    width: TILE,
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.color.surfaceSunken,
  },
  tileImg: { width: '100%', height: '100%' },
  coverBadge: {
    position: 'absolute',
    top: theme.space.sm,
    start: theme.space.sm,
    backgroundColor: theme.color.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  coverBadgeText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    color: theme.color.textOnPrimary,
    fontWeight: '600',
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
  removeText: { color: theme.color.white, fontSize: 14, fontWeight: '700' },
  addTile: {
    width: TILE,
    aspectRatio: 1,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.color.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.surface,
  },
  addText: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.primary,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: theme.space.sm,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.space.md,
    padding: theme.space.xl,
  },
  skeletonTile: { width: TILE, aspectRatio: 1, borderRadius: theme.radius.md },
  hint: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
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

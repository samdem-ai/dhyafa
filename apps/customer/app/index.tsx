/**
 * Home screen stub (M0).
 *
 * Shows:
 *  - Dyafa greeting (app_name from common:ar)
 *  - Search bar placeholder
 *  - Two horizontal rails ("Popular in…" and "Beachfront") with placeholder cards
 *  - A price chip rendered via formatDZD to exercise the i18n formatter
 *  - A map stub View (Mapbox wired in M1+ with EAS dev client)
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  SafeAreaView,
  I18nManager,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';
import { useSession } from '@/lib/auth';
import { becomeHost } from '@/lib/listings';

const HOST_CTA = {
  label: { ar: 'انتقل إلى وضع الاستضافة', fr: 'Passer en mode hôte', en: 'Switch to Hosting' },
  failed: {
    ar: 'تعذّر فتح وضع الاستضافة. حاول مرة أخرى.',
    fr: "Impossible d'ouvrir le mode hôte. Réessayez.",
    en: 'Could not open Hosting. Please try again.',
  },
} as const;

function pickCta(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

/** Auth-gated entry into Hosting: signs in if needed, else become_host → /host. */
function HostEntryButton({ locale }: { locale: Locale }) {
  const { user, loading: sessionLoading } = useSession();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    if (!user) {
      router.push({ pathname: '/(auth)/sign-in', params: { next: 'host' } });
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await becomeHost();
      router.push('/host');
    } catch {
      setError(pickCta(HOST_CTA.failed, locale));
    } finally {
      setWorking(false);
    }
  }

  return (
    <View style={styles.hostCtaWrap}>
      <Pressable
        accessibilityRole="button"
        onPress={() => void onPress()}
        disabled={working || sessionLoading}
        style={({ pressed }) => [styles.hostCta, pressed && styles.hostCtaPressed]}
      >
        {working ? (
          <ActivityIndicator color={theme.color.textOnPrimary} />
        ) : (
          <Text style={styles.hostCtaText}>🏡 {pickCta(HOST_CTA.label, locale)}</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.hostCtaError}>{error}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Placeholder property data (replaces live DB in M0)
// ---------------------------------------------------------------------------
interface PropertyStub {
  id: string;
  title: string;
  location: string;
  pricePerNight: number;
  rating: number;
}

const POPULAR_PROPERTIES: PropertyStub[] = [
  { id: '1', title: 'فيلا بحرية', location: 'عنابة', pricePerNight: 12000, rating: 4.9 },
  { id: '2', title: 'شقة تلمسان', location: 'تلمسان', pricePerNight: 8500, rating: 4.7 },
  { id: '3', title: 'رياض قديمة', location: 'بجاية', pricePerNight: 7200, rating: 4.8 },
];

const BEACHFRONT_PROPERTIES: PropertyStub[] = [
  { id: '4', title: 'شاليه ساحلي', location: 'مستغانم', pricePerNight: 15000, rating: 4.6 },
  { id: '5', title: 'بيت البحر', location: 'الطارف', pricePerNight: 11000, rating: 4.5 },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PropertyCard({ property, locale }: { property: PropertyStub; locale: Locale }) {
  return (
    <View style={styles.card}>
      {/* Cover image placeholder (expo-image + BlurHash in M1) */}
      <View style={styles.cardImage}>
        <Text style={styles.cardImagePlaceholder}>📷</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {property.title}
        </Text>
        <Text style={styles.cardLocation}>{property.location}</Text>

        <View style={styles.cardFooter}>
          {/* Price chip — Western Arabic numerals, دج / DZD suffix via formatDZD */}
          <View style={styles.priceChip}>
            <Text style={styles.priceText}>{formatDZD(property.pricePerNight, locale)}</Text>
            <Text style={styles.priceNight}> / ليلة</Text>
          </View>

          {/* Rating — terracotta star per brand spec */}
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>★</Text>
            <Text style={styles.ratingValue}>{property.rating}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Rail({
  title,
  properties,
  locale,
}: {
  title: string;
  properties: PropertyStub[];
  locale: Locale;
}) {
  return (
    <View style={styles.rail}>
      <View style={styles.railHeader}>
        <Text style={styles.railTitle}>{title}</Text>
        <Text style={styles.seeAll}>عرض الكل</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {properties.map((p) => (
          <PropertyCard key={p.id} property={p} locale={locale} />
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Map stub — Mapbox (@rnmapbox/maps) wired in M1+ with EAS dev client.
// Mapbox requires a native config plugin and is not Expo Go compatible.
// ---------------------------------------------------------------------------
function MapStub() {
  return (
    <View style={styles.mapStub}>
      <Text style={styles.mapStubText}>🗺  خريطة — تأتي في M1</Text>
      <Text style={styles.mapStubSub}>(Mapbox requires EAS dev client)</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const { t, i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const isRTL = I18nManager.isRTL;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, isRTL && styles.headerRTL]}>
          {/* app_name key from common.json → 'ضيافة' in ar */}
          <Text style={styles.greeting}>{t('app_name')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        {/* Search bar placeholder */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, isRTL && styles.searchInputRTL]}
            placeholder="ابحث عن وجهتك…"
            placeholderTextColor={theme.color.textMuted}
            editable={false}
            accessibilityLabel={t('nav.explore')}
          />
        </View>

        {/* Map stub */}
        <MapStub />

        {/* Rail 1 — Popular */}
        <Rail
          title="الأكثر طلبًا في الجزائر"
          properties={POPULAR_PROPERTIES}
          locale={locale}
        />

        {/* Rail 2 — Beachfront */}
        <Rail
          title="على شاطئ البحر"
          properties={BEACHFRONT_PROPERTIES}
          locale={locale}
        />

        {/* Host mode entry */}
        <HostEntryButton locale={locale} />

        {/* Dev navigation shortcut to language picker */}
        <View style={styles.devLinks}>
          <Link href="/onboarding" style={styles.devLink}>
            🌐 تغيير اللغة / Changer la langue
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles — all spacing uses theme tokens; logical props (marginStart/End,
// paddingStart/End) wherever direction-awareness matters.
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.color.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.space['3xl'],
  },

  // Header
  header: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.xl,
    paddingBottom: theme.space.lg,
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  greeting: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['display-lg'],
    fontWeight: '600',
    color: theme.color.primary,
    lineHeight: theme.lineHeight['display-lg'],
  },
  tagline: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-lg'],
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
    lineHeight: theme.lineHeight['body-lg'],
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.space.xl,
    marginBottom: theme.space.lg,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    ...theme.shadow.xs,
  },
  searchIcon: {
    fontSize: 18,
    marginEnd: theme.space.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    padding: 0,
  },
  searchInputRTL: {
    textAlign: 'right',
  },

  // Map stub
  mapStub: {
    marginHorizontal: theme.space.xl,
    marginBottom: theme.space.xl,
    height: 140,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  mapStubText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-lg'],
    color: theme.color.textMuted,
  },
  mapStubSub: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
  },

  // Rail
  rail: {
    marginBottom: theme.space['2xl'],
  },
  railHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.space.xl,
    marginBottom: theme.space.md,
  },
  railTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-2'],
    fontWeight: '600',
    color: theme.color.text,
    lineHeight: theme.lineHeight['heading-2'],
  },
  seeAll: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.accent,
    fontWeight: '600',
  },
  railContent: {
    paddingHorizontal: theme.space.xl,
    gap: theme.space.md,
  },

  // Property card
  card: {
    width: 200,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  cardImage: {
    height: 130,
    backgroundColor: theme.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholder: {
    fontSize: 36,
  },
  cardBody: {
    padding: theme.space.md,
  },
  cardTitle: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    lineHeight: theme.lineHeight.title,
  },
  cardLocation: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
    lineHeight: theme.lineHeight.caption,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.space.sm,
  },
  priceChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.sm,
    paddingVertical: 2,
  },
  priceText: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize['body-sm'],
    fontWeight: '700',
    color: theme.color.accent,
  },
  priceNight: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingStar: {
    fontSize: 12,
    color: theme.color.ratingStar,
  },
  ratingValue: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    fontWeight: '600',
    color: theme.color.text,
  },

  // Host CTA
  hostCtaWrap: {
    marginHorizontal: theme.space.xl,
    marginTop: theme.space.md,
  },
  hostCta: {
    backgroundColor: theme.color.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  hostCtaPressed: { opacity: 0.85 },
  hostCtaText: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.textOnPrimary,
  },
  hostCtaError: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.error,
    textAlign: 'center',
    marginTop: theme.space.sm,
  },

  // Dev
  devLinks: {
    marginTop: theme.space.xl,
    alignItems: 'center',
  },
  devLink: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.info,
    textDecorationLine: 'underline',
    paddingVertical: theme.space.sm,
  },
});

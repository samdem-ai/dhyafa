/**
 * Trips tab (M2).
 *
 * Segmented Upcoming / Completed / Cancelled over the signed-in guest's own
 * bookings (RLS-scoped). Status badges, designed skeletons, empty + error
 * states. awaiting_payment bookings surface a "complete payment" CTA → pay stub.
 * Signed-out guests see a sign-in prompt.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { useSession } from '@/lib/auth';
import {
  listMyBookings,
  bookingCoverUrl,
  isCancellable,
  type BookingWithProperty,
  type TripBucket,
} from '@/lib/bookings';
import { localizedName } from '@/lib/discovery';
import { CancelBookingSheet } from '@/components/CancelBookingSheet';
import { RemoteImage } from '@/components/RemoteImage';
import { BookingStatusBadge } from '@/components/discovery';
import { PrimaryButton, SkeletonList, ErrorState, EmptyState } from '@/components/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { L, pick, type LMessage } from '@/lib/copy';
import { useWilayaNames } from '@/lib/useWilayaNames';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const TABS: { key: TripBucket; label: LMessage }[] = [
  { key: 'upcoming', label: L.tabUpcoming },
  { key: 'completed', label: L.tabCompleted },
  { key: 'cancelled', label: L.tabCancelled },
];

export default function TripsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { user, loading: sessionLoading } = useSession();
  const wilayaNames = useWilayaNames(locale);

  const [bucket, setBucket] = useState<TripBucket>('upcoming');
  const [data, setData] = useState<BookingWithProperty[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<BookingWithProperty | null>(null);

  const load = useCallback(
    async (b: TripBucket) => {
      setError(null);
      try {
        const rows = await listMyBookings(b);
        setData(rows);
      } catch {
        setError(pick(L.loadError, locale));
        setData([]);
      }
    },
    [locale],
  );

  useFocusEffect(
    useCallback(() => {
      if (user) {
        setData(null);
        void load(bucket);
      }
    }, [user, bucket, load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(bucket);
    setRefreshing(false);
  }, [bucket, load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{pick(L.tripsTitle, locale)}</Text>
        <NotificationBell locale={locale} />
      </View>

      {/* Segmented control */}
      <View style={styles.segment}>
        {TABS.map((t) => {
          const active = t.key === bucket;
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setBucket(t.key)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {pick(t.label, locale)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!user && !sessionLoading ? (
        <EmptyState emoji="🧳" title={pick(L.tripsTitle, locale)} subtitle={pick(L.signInToSeeTrips, locale)} />
      ) : data === null ? (
        <SkeletonList count={3} />
      ) : error && data.length === 0 ? (
        <ErrorState message={error} onRetry={() => void load(bucket)} retryLabel={pick(L.search, locale)} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          ListEmptyComponent={
            <EmptyState emoji="🧳" title={pick(L.tripsEmptyTitle, locale)} subtitle={pick(L.tripsEmptyBody, locale)} />
          }
          renderItem={({ item }) => (
            <TripCard
              booking={item}
              locale={locale}
              wilayaName={wilayaNames.get(item.property?.wilaya_code ?? -1) ?? ''}
              onCancel={() => setCancelTarget(item)}
            />
          )}
        />
      )}

      {/* Cancel flow (quote_refund → confirm → cancel_booking) */}
      {cancelTarget ? (
        <CancelBookingSheet
          booking={cancelTarget}
          visible={cancelTarget != null}
          onClose={() => setCancelTarget(null)}
          onCancelled={() => void load(bucket)}
          locale={locale}
        />
      ) : null}
    </SafeAreaView>
  );
}

function TripCard({
  booking,
  locale,
  wilayaName,
  onCancel,
}: {
  booking: BookingWithProperty;
  locale: Locale;
  wilayaName: string;
  onCancel: () => void;
}) {
  const prop = booking.property;
  const title = prop
    ? localizedName({ name_ar: prop.title_ar, name_fr: prop.title_fr, name_en: prop.title_en }, locale)
    : '';
  const cover = bookingCoverUrl(booking);
  const range = formatRange(booking.check_in, booking.check_out, locale);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/booking/${booking.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <RemoteImage uri={cover} alt={title} radius={theme.radius.md} style={styles.cardImage} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
          <BookingStatusBadge status={booking.status} locale={locale} />
        </View>
        {wilayaName ? <Text style={styles.cardMeta}>{wilayaName}</Text> : null}
        <Text style={styles.cardMeta}>{range}</Text>
        <Text style={styles.cardPrice}>{formatDZD(booking.total_dzd, locale)}</Text>

        {booking.status === 'awaiting_payment' ? (
          <View style={styles.cardCta}>
            <PrimaryButton
              label={pick(L.completePayment, locale)}
              onPress={() => router.push(`/booking/${booking.id}/pay`)}
            />
          </View>
        ) : booking.status === 'completed' ? (
          <View style={styles.cardCta}>
            <PrimaryButton
              label={pick(L.leaveReview, locale)}
              variant="secondary"
              onPress={() => router.push(`/review/${booking.id}`)}
            />
          </View>
        ) : null}

        {isCancellable(booking.status) ? (
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            hitSlop={6}
            style={({ pressed }) => [styles.cancelLink, pressed && styles.cancelLinkPressed]}
          >
            <Text style={styles.cancelLinkText}>{pick(L.cancelBookingAction, locale)}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const textAlign = I18nManager.isRTL ? 'right' : 'left';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  title: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    color: theme.color.primary,
    textAlign,
  },
  pressed: { opacity: 0.92 },

  segment: {
    flexDirection: 'row',
    marginHorizontal: theme.space.xl,
    marginBottom: theme.space.md,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.pill,
    padding: 4,
    gap: 4,
  },
  segmentItem: { flex: 1, paddingVertical: theme.space.sm, borderRadius: theme.radius.pill, alignItems: 'center' },
  segmentItemActive: { backgroundColor: theme.color.surface, ...theme.shadow.xs },
  segmentText: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
  },
  segmentTextActive: { color: theme.color.text, fontWeight: '600' },

  listContent: { padding: theme.space.xl, gap: theme.space.md, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    padding: theme.space.md,
    gap: theme.space.md,
    ...theme.shadow.card,
  },
  cardImage: { width: 96, height: 96 },
  cardBody: { flex: 1, gap: 2 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  cardTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  cardMeta: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    textAlign,
  },
  cardPrice: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize.body,
    fontWeight: '700',
    color: theme.color.text,
    marginTop: theme.space.xs,
    textAlign,
  },
  cardCta: { marginTop: theme.space.sm },
  cancelLink: { marginTop: theme.space.sm, alignSelf: 'flex-start', paddingVertical: theme.space.xs },
  cancelLinkPressed: { opacity: 0.6 },
  cancelLinkText: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['body-sm'],
    fontWeight: '600',
    color: theme.color.error,
    textAlign,
  },
});

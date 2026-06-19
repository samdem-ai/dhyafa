/**
 * Trips tab (M2; redesigned Phase 8).
 *
 * Segmented Upcoming / Completed / Cancelled over the signed-in guest's own
 * bookings (RLS-scoped). Status badges, designed skeletons, empty + error
 * states. awaiting_payment bookings surface a "complete payment" CTA → pay stub.
 * Signed-out guests see a sign-in prompt.
 *
 * Redesign (Airbnb-style): borderless photo-first trip cards — a rounded photo
 * then plain text on the page (no surface box, shadow, or border). Lucide
 * outline icons (never emoji). Copy through the locale-aware <Heading>/<Text>
 * primitives. The single accent CTA is rationed to "complete payment".
 */

import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Luggage, MapPin, CalendarDays } from 'lucide-react-native';
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
import { BookingStatusBadge } from '@/components/discovery';
import {
  Heading,
  Text,
  Button,
  SegmentedControl,
  Skeleton,
  EmptyState,
  ErrorState,
  RemoteImage,
} from '@/ui';
import { NotificationBell } from '@/components/NotificationBell';
import { L, pick, type LMessage } from '@/lib/copy';
import { useWilayaNames } from '@/lib/useWilayaNames';
import { formatRange } from '@/lib/dateFormat';
import { theme } from '@/theme';

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

  const segments = TABS.map((t) => ({ value: t.key, label: pick(t.label, locale) }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Heading level={1} color="primary">
          {pick(L.tripsTitle, locale)}
        </Heading>
        <NotificationBell locale={locale} />
      </View>

      {/* Segmented buckets */}
      <View style={styles.segmentWrap}>
        <SegmentedControl<TripBucket> options={segments} value={bucket} onChange={setBucket} />
      </View>

      {!user && !sessionLoading ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon={Luggage}
            title={pick(L.tripsTitle, locale)}
            subtitle={pick(L.signInToSeeTrips, locale)}
            action={{ label: pick(L.signIn, locale), onPress: () => router.push('/(auth)/sign-in') }}
          />
        </View>
      ) : data === null ? (
        <TripsSkeleton />
      ) : error && data.length === 0 ? (
        <View style={styles.centerFill}>
          <ErrorState
            message={error}
            onRetry={() => void load(bucket)}
            retryLabel={pick(L.tryAgain, locale)}
          />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.color.primary}
              colors={[theme.color.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerFill}>
              <EmptyState
                icon={Luggage}
                title={pick(L.tripsEmptyTitle, locale)}
                subtitle={pick(L.tripsEmptyBody, locale)}
                action={{ label: pick(L.exploreStays, locale), onPress: () => router.push('/') }}
              />
            </View>
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
      <RemoteImage uri={cover} alt={title} radius={theme.radius.lg} style={styles.cardImage} />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text variant="body" weight="semibold" numberOfLines={1} style={styles.flex}>
            {title}
          </Text>
          <BookingStatusBadge status={booking.status} locale={locale} />
        </View>

        {wilayaName ? (
          <View style={styles.metaRow}>
            <MapPin size={14} color={theme.color.textMuted} strokeWidth={2} />
            <Text variant="body-sm" color="textMuted" numberOfLines={1} style={styles.flex}>
              {wilayaName}
            </Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <CalendarDays size={14} color={theme.color.textMuted} strokeWidth={2} />
          <Text variant="body-sm" color="textMuted" numberOfLines={1} style={styles.flex}>
            {range}
          </Text>
        </View>

        <Text variant="body" weight="bold" style={styles.price}>
          {formatDZD(booking.total_dzd, locale)}
        </Text>

        {booking.status === 'awaiting_payment' ? (
          <View style={styles.cardCta}>
            <Button
              label={pick(L.completePayment, locale)}
              variant="tertiary"
              size="md"
              onPress={() => router.push(`/booking/${booking.id}/pay`)}
            />
          </View>
        ) : booking.status === 'completed' ? (
          <View style={styles.cardCta}>
            <Button
              label={pick(L.leaveReview, locale)}
              variant="secondary"
              size="md"
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
            <Text variant="body-sm" weight="semibold" color="error">
              {pick(L.cancelBookingAction, locale)}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function TripsSkeleton() {
  return (
    <View style={styles.listContent}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={i > 0 ? styles.skelSpacer : undefined}>
          <View style={styles.card}>
            <Skeleton style={styles.cardImage} />
            <View style={styles.cardBody}>
              <Skeleton style={styles.skelLineWide} />
              <Skeleton style={styles.skelLineNarrow} />
              <Skeleton style={styles.skelLineNarrow} />
              <Skeleton style={styles.skelPrice} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const IMAGE = 104;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.92 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.sm,
  },

  segmentWrap: {
    marginHorizontal: theme.space.xl,
    marginBottom: theme.space.lg,
  },

  centerFill: { flex: 1, justifyContent: 'center' },

  listContent: { paddingHorizontal: theme.space.xl, paddingBottom: theme.space['2xl'], flexGrow: 1 },
  sep: { height: theme.space.xl },
  skelSpacer: { marginTop: theme.space.xl },

  // Borderless photo-first card — no surface box, no shadow, no border.
  card: {
    flexDirection: 'row',
    gap: theme.space.md,
    backgroundColor: 'transparent',
  },
  cardImage: { width: IMAGE, height: IMAGE, borderRadius: theme.radius.lg },
  cardBody: { flex: 1, gap: 4 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.sm,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs },
  price: { marginTop: theme.space.xs, writingDirection: 'ltr' },

  cardCta: { marginTop: theme.space.sm, alignSelf: 'flex-start' },
  cancelLink: { marginTop: theme.space.sm, alignSelf: 'flex-start', paddingVertical: theme.space.xs },
  cancelLinkPressed: { opacity: 0.6 },

  // Skeleton lines matching the real card layout.
  skelLineWide: { height: 16, width: '75%', borderRadius: theme.radius.sm },
  skelLineNarrow: { height: 13, width: '50%', borderRadius: theme.radius.sm },
  skelPrice: { height: 16, width: '40%', borderRadius: theme.radius.sm, marginTop: theme.space.xs },
});

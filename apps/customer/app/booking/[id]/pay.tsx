/**
 * Payment screen — STUB (M2).
 *
 * Chargily (Edahabia / CIB) integration is the NEXT step and is intentionally
 * NOT implemented here. This screen shows the amount due and a DISABLED
 * "Pay with Edahabia/CIB" button with a "sandbox integration pending" note.
 *
 * Boundary: no checkout call, no webview, no Chargily SDK. When payment lands,
 * replace the disabled button with the real Chargily checkout flow (see
 * docs/04-customer-app.md §3) and flip the booking via the webhook-backed status.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  I18nManager,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { getBookingDetail, type BookingWithProperty } from '@/lib/bookings';
import { Skeleton, ErrorState, PrimaryButton } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

export default function PaymentStubScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingWithProperty | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      setBooking(await getBookingDetail(id));
    } catch {
      setError(pick(L.loadError, locale));
      setBooking(null);
    }
  }, [id, locale]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.topBack}>{I18nManager.isRTL ? '→' : '←'}</Text>
        </Pressable>
        <Text style={styles.topTitle}>{pick(L.paymentTitle, locale)}</Text>
        <View style={styles.topSpacer} />
      </View>

      {booking === undefined ? (
        <View style={styles.body}>
          <Skeleton style={styles.skBlock} />
          <Skeleton style={styles.skBtn} />
        </View>
      ) : error && booking === null ? (
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.goBack, locale)} />
      ) : booking === null ? (
        <ErrorState message={pick(L.notFoundBody, locale)} retryLabel={pick(L.goBack, locale)} onRetry={() => router.back()} />
      ) : (
        <View style={styles.body}>
          {/* Next-step note */}
          <View style={styles.noteCard}>
            <Text style={styles.noteGlyph}>💳</Text>
            <Text style={styles.noteText}>{pick(L.paymentNextStep, locale)}</Text>
          </View>

          {/* Amount due */}
          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>{pick(L.amountDue, locale)}</Text>
            <Text style={styles.amountValue}>{formatDZD(booking.total_dzd, locale)}</Text>
            {booking.payment_deadline ? (
              <Text style={styles.deadline}>
                {pick(L.payByDeadline, locale)} {formatDateTime(booking.payment_deadline, locale)}
              </Text>
            ) : null}
            <Text style={styles.codeLine}>
              {pick(L.bookingCode, locale)}: {booking.code}
            </Text>
          </View>

          {/* Disabled pay button + sandbox note */}
          <View style={styles.payWrap}>
            <PrimaryButton label={pick(L.payWith, locale)} onPress={() => undefined} disabled />
            <Text style={styles.sandboxNote}>⏳ {pick(L.sandboxPending, locale)}</Text>
          </View>

          {/* Secondary nav */}
          <View style={styles.secondary}>
            <PrimaryButton
              label={pick(L.viewTrip, locale)}
              variant="secondary"
              onPress={() => router.replace(`/booking/${booking.id}`)}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const textAlign = I18nManager.isRTL ? 'right' : 'left';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.md,
    gap: theme.space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  topBack: { fontFamily: RN_FONTS.bodyBold, fontSize: theme.fontSize['heading-3'], color: theme.color.text },
  topTitle: {
    flex: 1,
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign: 'center',
  },
  topSpacer: { width: 24 },

  body: { padding: theme.space.xl, gap: theme.space.lg },

  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    backgroundColor: theme.color.infoBg,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },
  noteGlyph: { fontSize: 24 },
  noteText: {
    flex: 1,
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize.body,
    color: theme.color.info,
    lineHeight: theme.lineHeight.body,
    textAlign,
  },

  amountCard: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    padding: theme.space.xl,
    alignItems: 'center',
    gap: theme.space.xs,
    ...theme.shadow.card,
  },
  amountLabel: { fontFamily: RN_FONTS.arabicRegular, fontSize: theme.fontSize.body, color: theme.color.textMuted },
  amountValue: {
    fontFamily: RN_FONTS.bodyBold,
    fontSize: theme.fontSize['display-lg'],
    fontWeight: '700',
    color: theme.color.text,
    writingDirection: 'ltr',
  },
  deadline: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.warning,
    marginTop: theme.space.xs,
    textAlign: 'center',
  },
  codeLine: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
  },

  payWrap: { gap: theme.space.sm },
  sandboxNote: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign: 'center',
  },

  secondary: { marginTop: theme.space.sm },

  skBlock: { height: 140, width: '100%', borderRadius: theme.radius.card },
  skBtn: { height: 52, width: '100%', borderRadius: theme.radius.md },
});

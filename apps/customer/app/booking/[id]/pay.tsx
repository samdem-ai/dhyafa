/**
 * Payment screen (M2).
 *
 * Two paths, both converging on apply_payment_event server-side:
 *  1. REAL — "Pay with Edahabia/CIB" invokes the `payments-create-checkout` Edge
 *     Function, which creates a Chargily hosted checkout and returns a URL we open.
 *     Chargily's webhook (`payments-webhook-chargily`) later confirms the booking.
 *     Requires Chargily keys + a reachable edge runtime; otherwise it surfaces a
 *     friendly error.
 *  2. DEV (only in __DEV__) — "Simulate payment" calls the `dev_simulate_payment`
 *     RPC so the book→paid→confirmed loop is demoable locally without keys.
 *
 * After either, we refresh the booking; once `confirmed`, route to the trip.
 */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  I18nManager,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatDZD, type Locale } from '@dyafa/i18n';
import { supabaseClient } from '@/lib/supabase';
import { getBookingDetail, type BookingWithProperty } from '@/lib/bookings';
import { Skeleton, ErrorState, PrimaryButton } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

export default function PaymentScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const tt = (ar: string, fr: string, en: string) =>
    locale === 'ar' ? ar : locale === 'fr' ? fr : en;
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingWithProperty | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'real' | 'dev' | 'refresh'>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const b = await getBookingDetail(id);
      setBooking(b);
      if (b && b.status === 'confirmed') router.replace(`/booking/${b.id}`);
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

  const payReal = useCallback(async () => {
    if (!id) return;
    setBusy('real');
    setNotice(null);
    try {
      const { data, error: fnErr } = await supabaseClient.functions.invoke<{
        checkout_url?: string;
        error?: string;
      }>('payments-create-checkout', { body: { booking_id: id } });
      if (fnErr || !data?.checkout_url) {
        setNotice(
          tt(
            'تعذّر بدء الدفع عبر شارجيلي (الخدمة غير متاحة محليًا). استخدم المحاكاة في وضع التطوير.',
            'Impossible de démarrer le paiement Chargily (service indisponible en local). Utilisez la simulation en dev.',
            'Could not start Chargily payment (service unavailable locally). Use the dev simulation.',
          ),
        );
        return;
      }
      await Linking.openURL(data.checkout_url);
      setNotice(
        tt(
          'أكمل الدفع في المتصفح ثم عُد واضغط «تحديث الحالة».',
          'Terminez le paiement dans le navigateur, puis revenez et « Actualiser le statut ».',
          'Complete payment in the browser, then return and tap "Refresh status".',
        ),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [id, locale]);

  const payDev = useCallback(async () => {
    if (!id) return;
    setBusy('dev');
    setNotice(null);
    try {
      const { error: rpcErr } = await supabaseClient.rpc('dev_simulate_payment', {
        p_booking_id: id,
      });
      if (rpcErr) {
        setNotice(rpcErr.message);
        return;
      }
      router.replace(`/booking/${id}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [id]);

  const refresh = useCallback(async () => {
    setBusy('refresh');
    await load();
    setBusy(null);
  }, [load]);

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
        <ErrorState
          message={pick(L.notFoundBody, locale)}
          retryLabel={pick(L.goBack, locale)}
          onRetry={() => router.back()}
        />
      ) : (
        <View style={styles.body}>
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

          {notice ? (
            <View style={styles.noteCard}>
              <Text style={styles.noteText}>{notice}</Text>
            </View>
          ) : null}

          {/* Real Chargily payment */}
          <View style={styles.payWrap}>
            <PrimaryButton
              label={pick(L.payWith, locale)}
              onPress={() => void payReal()}
              disabled={busy !== null}
            />
            <Text style={styles.methodNote}>💳 Edahabia / CIB · Chargily Pay</Text>
          </View>

          {/* Dev simulation (local only) */}
          {IS_DEV ? (
            <View style={styles.devWrap}>
              <PrimaryButton
                label={tt('محاكاة دفع ناجح (تطوير)', 'Simuler un paiement (dev)', 'Simulate payment (dev)')}
                variant="secondary"
                onPress={() => void payDev()}
                disabled={busy !== null}
              />
              <Text style={styles.devNote}>
                {tt(
                  'وضع التطوير: يؤكّد الحجز دون شارجيلي.',
                  'Mode dev : confirme la réservation sans Chargily.',
                  'Dev mode: confirms the booking without Chargily.',
                )}
              </Text>
            </View>
          ) : null}

          {busy ? <ActivityIndicator color={theme.color.primary} style={styles.spinner} /> : null}

          {/* Refresh + view trip */}
          <View style={styles.secondary}>
            <Pressable onPress={() => void refresh()} disabled={busy !== null} hitSlop={8}>
              <Text style={styles.refreshLink}>
                {tt('تحديث الحالة', 'Actualiser le statut', 'Refresh status')}
              </Text>
            </Pressable>
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
    backgroundColor: theme.color.infoBg,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },
  noteText: {
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
  methodNote: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign: 'center',
  },

  devWrap: {
    gap: theme.space.sm,
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    paddingTop: theme.space.lg,
  },
  devNote: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.textMuted,
    textAlign: 'center',
  },

  spinner: { marginTop: theme.space.sm },

  secondary: { marginTop: theme.space.sm, gap: theme.space.md, alignItems: 'center' },
  refreshLink: {
    fontFamily: RN_FONTS.bodyMedium,
    fontSize: theme.fontSize.body,
    color: theme.color.primary,
  },

  skBlock: { height: 140, width: '100%', borderRadius: theme.radius.card },
  skBtn: { height: 52, width: '100%', borderRadius: theme.radius.md },
});

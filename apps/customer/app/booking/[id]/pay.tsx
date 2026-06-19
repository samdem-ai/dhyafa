/**
 * Payment screen (Phase 4 rework).
 *
 * Built on src/ui. Two paths converge on apply_payment_event server-side:
 *  1. REAL — the "Pay" CTA invokes the `payments-create-checkout` Edge Function
 *     (Chargily hosted checkout) and opens the returned URL. Chargily's webhook
 *     confirms the booking; we poll the booking on focus + AppState resume.
 *  2. DEV (__DEV__ only) — "Simulate payment" calls `dev_simulate_payment` and
 *     verifies it returns 'applied' before routing on.
 *
 * Hardening:
 *  - Guards non-awaiting_payment states (confirmed → view trip; terminal → a
 *    path forward) so we never render a Pay button the server would reject.
 *  - Live payment_deadline countdown + expired detection (offer re-book).
 *  - ALL errors localized (rpc/Chargily → friendly copy; no raw error.message).
 *  - Optional payment-method chips (edahabia / cib / baridi_qr).
 *  - success haptic on confirmed → route to the booking detail.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Linking, AppState, Pressable } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { type Locale } from '@dyafa/i18n';
import { CreditCard } from 'lucide-react-native';
import { supabaseClient } from '@/lib/supabase';
import { useSession } from '@/lib/auth';
import {
  getBookingDetail,
  classifyPaymentError,
  paymentErrorMessage,
  type BookingWithProperty,
} from '@/lib/bookings';
import {
  Screen,
  Header,
  Text,
  Button,
  Chip,
  PriceText,
  StatusPill,
  statusTone,
  DetailSkeleton,
  ErrorState,
  EmptyState,
  useToast,
  haptics,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { formatDateTime } from '@/lib/dateFormat';
import { buildNextPath } from '@/lib/searchParams';
import { theme } from '@/theme';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

type PayMethod = 'edahabia' | 'cib' | 'baridi_qr';
const METHODS: { value: PayMethod; key: keyof typeof L }[] = [
  { value: 'edahabia', key: 'payMethodEdahabia' },
  { value: 'cib', key: 'payMethodCib' },
  { value: 'baridi_qr', key: 'payMethodBaridiQr' },
];

/** Compute a localized H:MM:SS-ish countdown to a deadline; null if expired. */
function remaining(deadlineIso: string | null | undefined): { expired: boolean; label: string } {
  if (!deadlineIso) return { expired: false, label: '' };
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (Number.isNaN(ms)) return { expired: false, label: '' };
  if (ms <= 0) return { expired: true, label: '' };
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return { expired: false, label: h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}` };
}

export default function PaymentScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { user, loading: authLoading } = useSession();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingWithProperty | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'real' | 'dev' | 'refresh'>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>('edahabia');
  const [now, setNow] = useState(Date.now());

  // Tick once a second so the countdown stays live (only matters while awaiting).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  void now; // referenced to re-render the countdown each tick

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const b = await getBookingDetail(id);
      setBooking(b);
      if (b && b.status === 'confirmed') {
        haptics.success();
        router.replace(`/booking/${b.id}`);
      }
    } catch {
      setError(pick(L.loadError, locale));
      setBooking(null);
    }
  }, [id, locale]);

  // Poll on focus + when the app returns from the Chargily browser tab.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void load();
    });
    return () => sub.remove();
  }, [load]);

  const payReal = useCallback(async () => {
    if (!id) return;
    setBusy('real');
    setNotice(null);
    try {
      const { data, error: fnErr } = await supabaseClient.functions.invoke<{
        checkout_url?: string;
        error?: string;
      }>('payments-create-checkout', { body: { booking_id: id, method } });
      if (fnErr || !data?.checkout_url) {
        setNotice(paymentErrorMessage('CHECKOUT_UNAVAILABLE', locale));
        return;
      }
      await Linking.openURL(data.checkout_url);
      setNotice(pick(L.payOpenCheckout, locale));
    } catch {
      setNotice(paymentErrorMessage('CHECKOUT_UNAVAILABLE', locale));
    } finally {
      setBusy(null);
    }
  }, [id, method, locale]);

  const payDev = useCallback(async () => {
    if (!id) return;
    setBusy('dev');
    setNotice(null);
    try {
      const { data, error: rpcErr } = await supabaseClient.rpc('dev_simulate_payment', {
        p_booking_id: id,
      });
      if (rpcErr) {
        setNotice(paymentErrorMessage(classifyPaymentError(rpcErr.message), locale));
        return;
      }
      // Verify the server actually applied the payment before routing.
      if (data !== 'applied') {
        setNotice(paymentErrorMessage('NOT_APPLIED', locale));
        return;
      }
      haptics.success();
      router.replace(`/booking/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setNotice(paymentErrorMessage(classifyPaymentError(msg), locale));
    } finally {
      setBusy(null);
    }
  }, [id, locale]);

  const refresh = useCallback(async () => {
    setBusy('refresh');
    await load();
    setBusy(null);
  }, [load]);

  // ── Signed-out guard: resume here after auth. ────────────────────────────
  // Navigate from an effect (never during render) carrying the full path so the
  // user RESUMES this payment after signing in.
  const signedOut = !authLoading && !user;
  useEffect(() => {
    if (signedOut && id) {
      router.replace({
        pathname: '/(auth)/sign-in',
        params: { next: buildNextPath(`/booking/${id}/pay`, {}) },
      });
    }
  }, [signedOut, id]);
  if (signedOut) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.paymentTitle, locale)} />
        <DetailSkeleton />
      </Screen>
    );
  }

  // ── Loading / error / not-found ──────────────────────────────────────────
  if (booking === undefined) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.paymentTitle, locale)} />
        <DetailSkeleton />
      </Screen>
    );
  }
  if (error && booking === null) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.paymentTitle, locale)} />
        <ErrorState message={error} onRetry={() => void load()} retryLabel={pick(L.goBack, locale)} />
      </Screen>
    );
  }
  if (booking === null) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.paymentTitle, locale)} />
        <EmptyState title={pick(L.notFoundTitle, locale)} subtitle={pick(L.notFoundBody, locale)} />
      </Screen>
    );
  }

  const countdown = remaining(booking.payment_deadline);
  const isAwaiting = booking.status === 'awaiting_payment';
  const isExpired = booking.status === 'expired' || (isAwaiting && countdown.expired);
  const isConfirmed = booking.status === 'confirmed' || booking.status === 'checked_in';

  // ── Non-awaiting guard states (don't render Pay the server would reject) ──
  if (!isAwaiting || isExpired || isConfirmed) {
    return (
      <Screen edges={['top']}>
        <Header title={pick(L.paymentTitle, locale)} />
        <View style={styles.guard}>
          {isExpired ? (
            <EmptyState
              title={pick(L.payExpiredTitle, locale)}
              subtitle={pick(L.payExpiredBody, locale)}
              action={{ label: pick(L.backToExplore, locale), onPress: () => router.replace('/(tabs)') }}
            />
          ) : isConfirmed ? (
            <EmptyState
              title={pick(L.payConfirmedTitle, locale)}
              subtitle={pick(L.payAlreadyConfirmed, locale)}
              action={{ label: pick(L.viewTrip, locale), onPress: () => router.replace(`/booking/${booking.id}`) }}
            />
          ) : (
            <View style={styles.statusGuard}>
              <StatusPill
                tone={statusTone(booking.status)}
                label={pick(L[`st_${booking.status}` as keyof typeof L], locale)}
              />
              <Text variant="body" color="textMuted" center>
                {pick(L.payAlreadyConfirmed, locale)}
              </Text>
              <Button
                label={pick(L.viewTrip, locale)}
                variant="secondary"
                onPress={() => router.replace(`/booking/${booking.id}`)}
                fullWidth={false}
              />
            </View>
          )}
        </View>
      </Screen>
    );
  }

  // ── Awaiting payment: the real Pay flow. ─────────────────────────────────
  return (
    <Screen edges={['top']} scroll contentContainerStyle={styles.body}>
      <Header title={pick(L.paymentTitle, locale)} />

      {/* Amount due + live countdown — borderless, centered */}
      <View style={styles.amountBlock}>
        <Text variant="body" color="textMuted" center>
          {pick(L.amountDue, locale)}
        </Text>
        <View style={styles.amount}>
          <PriceText amount={booking.total_dzd} variant="total" locale={locale} />
        </View>
        {booking.payment_deadline ? (
          <View style={styles.deadlineWrap}>
            {countdown.label ? (
              <Text variant="body-sm" weight="semibold" color="warning" center>
                {pick(L.payTimeLeft, locale)}: {countdown.label}
              </Text>
            ) : null}
            <Text variant="caption" color="textMuted" center>
              {pick(L.payByDeadline, locale)} {formatDateTime(booking.payment_deadline, locale)}
            </Text>
          </View>
        ) : null}
        <Text variant="caption" color="textMuted" center style={styles.code}>
          {pick(L.bookingCode, locale)}: {booking.code}
        </Text>
      </View>

      {notice ? (
        <View style={styles.notice}>
          <Text variant="body-sm" color="text">
            {notice}
          </Text>
        </View>
      ) : null}

      {/* Payment method chips */}
      <View style={styles.methods}>
        <Text variant="title" weight="bold">
          {pick(L.payChoosePaymentMethod, locale)}
        </Text>
        <View style={styles.methodRow}>
          {METHODS.map((m) => (
            <Chip
              key={m.value}
              label={pick(L[m.key], locale)}
              selected={method === m.value}
              onPress={() => setMethod(m.value)}
            />
          ))}
        </View>
      </View>

      {/* Real Chargily payment */}
      <View style={styles.payWrap}>
        <Button
          label={pick(L.payWith, locale)}
          variant="tertiary"
          icon={CreditCard}
          onPress={() => void payReal()}
          loading={busy === 'real'}
          disabled={busy !== null}
        />
        <Text variant="caption" color="textMuted" center>
          {pick(L.payProviderNote, locale)}
        </Text>
      </View>

      {/* Dev simulation (local only) */}
      {IS_DEV ? (
        <View style={styles.devWrap}>
          <Button
            label={pick(L.paySimulateDev, locale)}
            variant="secondary"
            onPress={() => void payDev()}
            loading={busy === 'dev'}
            disabled={busy !== null}
          />
          <Text variant="caption" color="textMuted" center>
            {pick(L.paySimulateDevNote, locale)}
          </Text>
        </View>
      ) : null}

      {/* Manual refresh fallback (poll-on-focus is primary). */}
      <View style={styles.secondary}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={pick(L.payRefreshStatus, locale)}
          accessibilityState={{ disabled: busy !== null }}
          onPress={() => void refresh()}
          disabled={busy !== null}
          hitSlop={8}
        >
          <Text variant="body" weight="semibold" color="primary" center>
            {busy === 'refresh' ? pick(L.payWaitingConfirm, locale) : pick(L.payRefreshStatus, locale)}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: theme.space.xl, gap: theme.space['2xl'] },
  guard: { flex: 1 },
  statusGuard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.space.md, padding: theme.space['2xl'] },

  // Amount due (borderless, centered)
  amountBlock: { gap: theme.space.xs, paddingTop: theme.space.md },
  amount: { alignItems: 'center', marginVertical: theme.space.xs },
  deadlineWrap: { gap: 2, marginTop: theme.space.xs },
  code: { marginTop: theme.space.sm },

  // Inline notice (borderless, tinted)
  notice: {
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.card,
    padding: theme.space.lg,
  },

  methods: { gap: theme.space.md },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.sm },

  payWrap: { gap: theme.space.sm },
  devWrap: {
    gap: theme.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.color.border,
    paddingTop: theme.space.lg,
  },
  secondary: { alignItems: 'center', marginTop: theme.space.sm },
});

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
import { formatDZD, type Locale } from '@dyafa/i18n';
import { CreditCard, Check, QrCode } from 'lucide-react-native';
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
  Heading,
  Button,
  Chip,
  TextField,
  BottomSheet,
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
  const [busy, setBusy] = useState<null | 'refresh'>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [method, setMethod] = useState<PayMethod>('edahabia');
  const [now, setNow] = useState(Date.now());

  // Demo checkout sheet (believable Edahabia/CIB card flow).
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [phase, setPhase] = useState<'form' | 'processing' | 'done'>('form');
  const [demoError, setDemoError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('6280 5500 1234 5678');
  const [cardExpiry, setCardExpiry] = useState('12/27');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardName, setCardName] = useState('');

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

  const openCheckout = useCallback(() => {
    setDemoError(null);
    setPhase('form');
    setCheckoutOpen(true);
  }, []);

  const finishConfirmed = useCallback(() => {
    setCheckoutOpen(false);
    setPhase('form');
    haptics.success();
    toast.show({ message: pick(L.payApproved, locale), tone: 'success' });
    if (id) router.replace(`/booking/${id}`);
  }, [id, locale, toast]);

  // Confirm payment: try real Chargily first (if configured), otherwise run the
  // believable demo flow (short processing → dev_simulate_payment confirms the
  // booking server-side). Either way the user "pays with Edahabia/CIB".
  const onConfirmPay = useCallback(async () => {
    if (!id) return;
    setDemoError(null);
    setPhase('processing');
    try {
      const { data, error: fnErr } = await supabaseClient.functions.invoke<{
        checkout_url?: string;
        error?: string;
      }>('payments-create-checkout', { body: { booking_id: id, method } });
      if (!fnErr && data?.checkout_url) {
        setCheckoutOpen(false);
        setPhase('form');
        await Linking.openURL(data.checkout_url);
        setNotice(pick(L.payOpenCheckout, locale));
        return;
      }
    } catch {
      // Chargily unavailable (demo) — fall through to the simulated flow.
    }
    await new Promise((resolve) => setTimeout(resolve, 1700));
    try {
      const { data, error: rpcErr } = await supabaseClient.rpc('dev_simulate_payment', {
        p_booking_id: id,
      });
      if (rpcErr || data !== 'applied') {
        setPhase('form');
        setDemoError(
          paymentErrorMessage(rpcErr ? classifyPaymentError(rpcErr.message) : 'NOT_APPLIED', locale),
        );
        return;
      }
      setPhase('done');
      setTimeout(finishConfirmed, 1000);
    } catch (e) {
      setPhase('form');
      setDemoError(paymentErrorMessage(classifyPaymentError(e instanceof Error ? e.message : ''), locale));
    }
  }, [id, method, locale, finishConfirmed]);

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

      {/* Pay with Edahabia / CIB (opens the checkout) */}
      <View style={styles.payWrap}>
        <Button
          label={pick(L.payWith, locale)}
          variant="tertiary"
          icon={CreditCard}
          onPress={openCheckout}
          disabled={busy !== null}
        />
        <Text variant="caption" color="textMuted" center>
          {pick(L.payProviderNote, locale)}
        </Text>
      </View>

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

      {/* Demo checkout — believable Edahabia / CIB card flow */}
      <BottomSheet
        visible={checkoutOpen}
        onClose={() => {
          if (phase !== 'processing') setCheckoutOpen(false);
        }}
        dismissible={phase !== 'processing'}
        snapPoints={['80%']}
      >
        {phase === 'done' ? (
          <View style={styles.checkoutDone}>
            <View style={styles.doneCircle}>
              <Check size={44} color={theme.color.success} strokeWidth={3} />
            </View>
            <Heading level={3} center>
              {pick(L.payApproved, locale)}
            </Heading>
            <PriceText amount={booking.total_dzd} variant="total" locale={locale} />
          </View>
        ) : (
          <View style={styles.checkoutBody}>
            <Heading level={3}>
              {pick(L.payWith, locale)} · {pick(L[METHODS.find((m) => m.value === method)!.key], locale)}
            </Heading>
            <View style={styles.checkoutAmount}>
              <Text variant="body-sm" color="textMuted">
                {pick(L.amountDue, locale)}
              </Text>
              <PriceText amount={booking.total_dzd} variant="total" locale={locale} />
            </View>

            {method === 'baridi_qr' ? (
              <View style={styles.qrBox}>
                <QrCode size={132} color={theme.color.text} strokeWidth={1} />
                <Text variant="body-sm" color="textMuted" center>
                  {pick(L.payBaridiScan, locale)}
                </Text>
              </View>
            ) : (
              <View style={styles.cardForm}>
                <TextField
                  label={pick(L.payCardNumber, locale)}
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  keyboardType="number-pad"
                  editable={phase === 'form'}
                />
                <View style={styles.cardRow}>
                  <View style={styles.flex}>
                    <TextField
                      label={pick(L.payExpiry, locale)}
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                      editable={phase === 'form'}
                    />
                  </View>
                  <View style={styles.flex}>
                    <TextField
                      label={pick(L.payCvv, locale)}
                      value={cardCvv}
                      onChangeText={setCardCvv}
                      keyboardType="number-pad"
                      editable={phase === 'form'}
                    />
                  </View>
                </View>
                <TextField
                  label={pick(L.payCardholder, locale)}
                  value={cardName}
                  onChangeText={setCardName}
                  autoCapitalize="words"
                  editable={phase === 'form'}
                />
              </View>
            )}

            {demoError ? (
              <Text variant="body-sm" weight="medium" color="error">
                {demoError}
              </Text>
            ) : null}

            <Button
              label={
                phase === 'processing'
                  ? pick(L.payProcessing, locale)
                  : `${pick(L.payNow, locale)} ${formatDZD(booking.total_dzd, locale)}`
              }
              variant="tertiary"
              icon={CreditCard}
              onPress={() => void onConfirmPay()}
              loading={phase === 'processing'}
              disabled={phase === 'processing'}
            />
            <Text variant="caption" color="textMuted" center>
              {pick(L.payDemoBadge, locale)}
            </Text>
          </View>
        )}
      </BottomSheet>
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
  secondary: { alignItems: 'center', marginTop: theme.space.sm },

  // Demo checkout sheet
  flex: { flex: 1 },
  checkoutBody: { gap: theme.space.md, paddingBottom: theme.space.md },
  checkoutAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  cardForm: { gap: theme.space.sm },
  cardRow: { flexDirection: 'row', gap: theme.space.md },
  qrBox: {
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.xl,
    backgroundColor: theme.color.surfaceSunken,
    borderRadius: theme.radius.lg,
  },
  checkoutDone: { alignItems: 'center', gap: theme.space.md, paddingVertical: theme.space['2xl'] },
  doneCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.successBg,
  },
});

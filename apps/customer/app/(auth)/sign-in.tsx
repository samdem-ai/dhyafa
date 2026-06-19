/**
 * Sign-in screen (Phase 4 rework; redesigned Phase 8) — email + password.
 *
 * Built on src/ui (Screen/Header/Heading/Text/Button/TextField/BottomSheet/Toast).
 * Airy, text-first layout: a serif brand title carries the screen (no native
 * header), generous whitespace, the shared AuthForm field stack, and an outline
 * forgot-password sheet.
 *
 * `next` is a VALIDATED internal pathname (via safeNextPath): the legacy 'host'
 * token still works, and any in-app absolute path (e.g. the in-progress checkout
 * `/booking/confirm?...`) is honored so the user returns with context intact.
 * Auth errors are differentiated (invalid creds / unconfirmed email / rate-limit)
 * with localized copy, and a forgot-password sheet calls resetPasswordForEmail.
 */

import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { signInWithPassword, authErrorMessage, sendPasswordReset } from '@/lib/auth';
import { AuthForm } from '@/components/AuthForm';
import { Screen, Header, Heading, Text, Button, TextField, BottomSheet, useToast } from '@/ui';
import { L, pick } from '@/lib/copy';
import { safeNextPath } from '@/lib/searchParams';
import { theme } from '@/theme';

const COPY = {
  title: { ar: 'مرحبًا بعودتك', fr: 'Bon retour', en: 'Welcome back' },
  subtitle: {
    ar: 'سجّل الدخول لإدارة إقاماتك واستضافتك',
    fr: 'Connectez-vous pour gérer vos séjours et hébergements',
    en: 'Sign in to manage your stays and hosting',
  },
  submit: { ar: 'تسجيل الدخول', fr: 'Se connecter', en: 'Sign in' },
  noAccount: { ar: 'ليس لديك حساب؟', fr: 'Pas de compte ?', en: 'No account?' },
  signUp: { ar: 'أنشئ حسابًا', fr: 'Créer un compte', en: 'Sign up' },
  failed: {
    ar: 'تعذّر تسجيل الدخول. تحقق من بريدك وكلمة المرور.',
    fr: 'Échec de la connexion. Vérifiez vos identifiants.',
    en: 'Sign-in failed. Check your email and password.',
  },
} as const;

function pickC(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

/** Resolve where to go after a successful sign-in, honoring a validated `next`. */
function resumeAfterAuth(next: string | undefined): void {
  const target = safeNextPath(next);
  if (target) {
    router.replace(target as never);
  } else if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

export default function SignInScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const toast = useToast();
  // `next` may be the legacy 'host' token OR a full in-app path (e.g. the
  // in-progress `/booking/confirm?...`). safeNextPath validates it.
  const params = useLocalSearchParams<{ next?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  async function handleSubmit({ email, password }: { email: string; password: string }) {
    setLoading(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
      resumeAfterAuth(params.next);
    } catch (err) {
      setError(authErrorMessage(err, locale, pickC(COPY.failed, locale)));
    } finally {
      setLoading(false);
    }
  }

  // Preserve `next` so a user who detours to sign-up still resumes the same flow.
  const signUpHref = params.next
    ? { pathname: '/(auth)/sign-up' as const, params: { next: params.next } }
    : ('/(auth)/sign-up' as const);

  return (
    <Screen>
      <Header />
      <View style={styles.intro}>
        <Heading level="display-lg" color="primary">
          {pickC(COPY.title, locale)}
        </Heading>
        <Text variant="body-lg" color="textMuted" style={styles.subtitle}>
          {pickC(COPY.subtitle, locale)}
        </Text>
      </View>

      <AuthForm
        locale={locale}
        mode="sign-in"
        submitLabel={pickC(COPY.submit, locale)}
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        footer={
          <View style={styles.footerCol}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setForgotOpen(true)}
              hitSlop={8}
              style={styles.forgot}
            >
              <Text variant="body-sm" weight="semibold" color="primary">
                {pick(L.forgotPassword, locale)}
              </Text>
            </Pressable>
            <View style={styles.footer}>
              <Text variant="body-sm" color="textMuted">
                {pickC(COPY.noAccount, locale)}{' '}
              </Text>
              <Link href={signUpHref} asChild>
                <Pressable accessibilityRole="link">
                  <Text variant="body-sm" weight="semibold" color="accent">
                    {pickC(COPY.signUp, locale)}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        }
      />

      <ForgotPasswordSheet
        visible={forgotOpen}
        locale={locale}
        onClose={() => setForgotOpen(false)}
        onSent={() => {
          setForgotOpen(false);
          toast.show({ message: pick(L.resetPasswordSent, locale), tone: 'info' });
        }}
        onRateLimited={() => {
          setForgotOpen(false);
          toast.show({ message: pick(L.authErrorRateLimit, locale), tone: 'warning' });
        }}
      />
    </Screen>
  );
}

function ForgotPasswordSheet({
  visible,
  locale,
  onClose,
  onSent,
  onRateLimited,
}: {
  visible: boolean;
  locale: Locale;
  onClose: () => void;
  onSent: () => void;
  onRateLimited: () => void;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (email.trim().length < 4) return;
    setBusy(true);
    try {
      await sendPasswordReset(email);
      onSent();
    } catch {
      // sendPasswordReset only rethrows on rate-limit.
      onRateLimited();
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} dismissible={!busy}>
      <View style={styles.sheet}>
        <Heading level={3}>{pick(L.resetPasswordTitle, locale)}</Heading>
        <Text variant="body" color="textMuted">
          {pick(L.resetPasswordBody, locale)}
        </Text>
        <TextField
          label={pick(L.authEmailLabel, locale)}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={() => void submit()}
        />
        <Button
          label={pick(L.sendResetLink, locale)}
          onPress={() => void submit()}
          loading={busy}
          disabled={email.trim().length < 4}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.xl,
    paddingBottom: theme.space.sm,
  },
  subtitle: { marginTop: theme.space.sm },
  footerCol: { marginTop: theme.space.xl, gap: theme.space.xl, alignItems: 'center' },
  forgot: { alignSelf: 'center' },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: { gap: theme.space.md, paddingTop: theme.space.sm, paddingBottom: theme.space.lg },
});

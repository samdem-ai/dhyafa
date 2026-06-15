/**
 * Sign-up screen (Phase 4 rework) — email + password.
 *
 * Built on src/ui. On success: if a session is returned (email confirmation
 * disabled in local dev) we resume the validated `next` path (so checkout
 * continues); otherwise we show a "check your email" state with a resend action.
 */

import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { MailCheck } from 'lucide-react-native';
import {
  signUpWithPassword,
  supabase,
  authErrorMessage,
  resendConfirmation,
} from '@/lib/auth';
import { AuthForm } from '@/components/AuthForm';
import { Screen, Header, Heading, Text, Button, EmptyState, useToast } from '@/ui';
import { L, pick } from '@/lib/copy';
import { safeNextPath } from '@/lib/searchParams';
import { theme } from '@/theme';

const COPY = {
  title: { ar: 'أنشئ حسابك', fr: 'Créez votre compte', en: 'Create your account' },
  subtitle: {
    ar: 'انضم إلى ضيافة لحجز إقامتك أو استضافة ضيوفك',
    fr: 'Rejoignez Dyafa pour réserver ou héberger',
    en: 'Join Dyafa to book stays or host guests',
  },
  submit: { ar: 'إنشاء حساب', fr: "S'inscrire", en: 'Sign up' },
  haveAccount: { ar: 'لديك حساب؟', fr: 'Déjà inscrit ?', en: 'Have an account?' },
  signIn: { ar: 'تسجيل الدخول', fr: 'Se connecter', en: 'Sign in' },
  failed: {
    ar: 'تعذّر إنشاء الحساب. حاول مرة أخرى.',
    fr: 'Échec de la création du compte. Réessayez.',
    en: 'Sign-up failed. Please try again.',
  },
  checkEmailTitle: { ar: 'تحقق من بريدك', fr: 'Vérifiez vos e-mails', en: 'Check your email' },
  checkEmailBody: {
    ar: 'أرسلنا رابط تأكيد إلى بريدك الإلكتروني لإكمال التسجيل.',
    fr: 'Nous avons envoyé un lien de confirmation à votre adresse e-mail.',
    en: 'We sent a confirmation link to your email to finish signing up.',
  },
} as const;

function pickC(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

function resumeAfterAuth(next: string | undefined): void {
  const target = safeNextPath(next);
  if (target) router.replace(target as never);
  else if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function SignUpScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const toast = useToast();
  const params = useLocalSearchParams<{ next?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handleSubmit({
    email,
    password,
    displayName,
  }: {
    email: string;
    password: string;
    displayName?: string;
  }) {
    setLoading(true);
    setError(null);
    try {
      await signUpWithPassword(email, password, displayName);
      // If local dev auto-confirms, a session exists immediately.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        resumeAfterAuth(params.next);
      } else {
        setConfirmEmail(email.trim());
      }
    } catch (err) {
      setError(authErrorMessage(err, locale, pickC(COPY.failed, locale)));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!confirmEmail) return;
    setResending(true);
    try {
      await resendConfirmation(confirmEmail);
      toast.show({ message: pick(L.resendEmailSent, locale), tone: 'info' });
    } catch {
      toast.show({ message: pick(L.authErrorRateLimit, locale), tone: 'warning' });
    } finally {
      setResending(false);
    }
  }

  // Preserve `next` when bouncing over to sign-in.
  const signInHref = params.next
    ? { pathname: '/(auth)/sign-in' as const, params: { next: params.next } }
    : ('/(auth)/sign-in' as const);

  if (confirmEmail) {
    return (
      <Screen>
        <Header title={pickC(COPY.title, locale)} />
        <EmptyState
          icon={MailCheck}
          title={pickC(COPY.checkEmailTitle, locale)}
          subtitle={pickC(COPY.checkEmailBody, locale)}
        />
        <View style={styles.confirmActions}>
          <Button
            label={pick(L.resendEmail, locale)}
            variant="secondary"
            onPress={() => void handleResend()}
            loading={resending}
            fullWidth={false}
          />
          <Link href={signInHref} asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text variant="body-sm" weight="semibold" color="accent">
                {pickC(COPY.signIn, locale)}
              </Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={pickC(COPY.title, locale)} />
      <View style={styles.header}>
        <Heading level={1} color="primary">
          {pickC(COPY.title, locale)}
        </Heading>
        <Text variant="body" color="textMuted" style={styles.subtitle}>
          {pickC(COPY.subtitle, locale)}
        </Text>
      </View>

      <AuthForm
        locale={locale}
        mode="sign-up"
        submitLabel={pickC(COPY.submit, locale)}
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        footer={
          <View style={styles.footer}>
            <Text variant="body-sm" color="textMuted">
              {pickC(COPY.haveAccount, locale)}{' '}
            </Text>
            <Link href={signInHref} asChild>
              <Pressable accessibilityRole="link">
                <Text variant="body-sm" weight="semibold" color="accent">
                  {pickC(COPY.signIn, locale)}
                </Text>
              </Pressable>
            </Link>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.lg },
  subtitle: { marginTop: theme.space.xs },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.space.lg,
  },
  confirmActions: { alignItems: 'center', gap: theme.space.lg, paddingBottom: theme.space['2xl'] },
});

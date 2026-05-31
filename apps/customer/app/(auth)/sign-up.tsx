/**
 * Sign-up screen — email + password (supabase.auth.signUp).
 *
 * On success: if a session is returned (email confirmation disabled in local
 * dev) we proceed back; otherwise we show a "check your email" confirmation.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { signUpWithPassword, supabase } from '@/lib/auth';
import { AuthForm } from '@/components/AuthForm';
import { EmptyState } from '@/components/ui';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

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
  checkEmailTitle: {
    ar: 'تحقق من بريدك',
    fr: 'Vérifiez vos e-mails',
    en: 'Check your email',
  },
  checkEmailBody: {
    ar: 'أرسلنا رابط تأكيد إلى بريدك الإلكتروني لإكمال التسجيل.',
    fr: 'Nous avons envoyé un lien de confirmation à votre adresse e-mail.',
    en: 'We sent a confirmation link to your email to finish signing up.',
  },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

export default function SignUpScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

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
        if (router.canGoBack()) router.back();
        else router.replace('/');
      } else {
        setNeedsConfirm(true);
      }
    } catch {
      setError(pick(COPY.failed, locale));
    } finally {
      setLoading(false);
    }
  }

  if (needsConfirm) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState
          emoji="📧"
          title={pick(COPY.checkEmailTitle, locale)}
          subtitle={pick(COPY.checkEmailBody, locale)}
        />
        <View style={styles.confirmFooter}>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable accessibilityRole="link">
              <Text style={styles.footerLink}>{pick(COPY.signIn, locale)}</Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{pick(COPY.title, locale)}</Text>
        <Text style={styles.subtitle}>{pick(COPY.subtitle, locale)}</Text>
      </View>

      <AuthForm
        locale={locale}
        mode="sign-up"
        submitLabel={pick(COPY.submit, locale)}
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        footer={
          <View style={styles.footer}>
            <Text style={styles.footerText}>{pick(COPY.haveAccount, locale)} </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.footerLink}>{pick(COPY.signIn, locale)}</Text>
              </Pressable>
            </Link>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.xl },
  title: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    color: theme.color.primary,
  },
  subtitle: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.textMuted,
    marginTop: theme.space.xs,
    lineHeight: theme.lineHeight.body,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.space.lg,
  },
  footerText: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
  },
  footerLink: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.accent,
    fontWeight: '600',
  },
  confirmFooter: { alignItems: 'center', paddingBottom: theme.space['2xl'] },
});

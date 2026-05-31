/**
 * Sign-in screen — email + password (supabase.auth.signInWithPassword).
 * On success, returns to where the user came from (router.back) or home.
 */

import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { signInWithPassword } from '@/lib/auth';
import { AuthForm } from '@/components/AuthForm';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

const COPY = {
  title: { ar: 'مرحبًا بعودتك', fr: 'Bon retour', en: 'Welcome back' },
  subtitle: {
    ar: 'سجّل الدخول لإدارة إقاماتك واستضافتك',
    fr: 'Connectez-vous pour gérer vos séjours et hébergements',
    en: 'Sign in to manage your stays and hosting',
  },
  submit: { ar: 'تسجيل الدخول', fr: 'Se connecter', en: 'Sign in' },
  noAccount: { ar: 'ليس لديك حساب؟', fr: 'Pas de compte ?', en: "No account?" },
  signUp: { ar: 'أنشئ حسابًا', fr: 'Créer un compte', en: 'Sign up' },
  failed: {
    ar: 'تعذّر تسجيل الدخول. تحقق من بريدك وكلمة المرور.',
    fr: 'Échec de la connexion. Vérifiez vos identifiants.',
    en: 'Sign-in failed. Check your email and password.',
  },
} as const;

function pick(m: { ar: string; fr: string; en: string }, l: Locale): string {
  return l === 'fr' ? m.fr : l === 'en' ? m.en : m.ar;
}

export default function SignInScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;
  // `next` is a known route group ('host' | 'home') rather than a free-form
  // path, so it stays compatible with expo-router typed routes.
  const params = useLocalSearchParams<{ next?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit({ email, password }: { email: string; password: string }) {
    setLoading(true);
    setError(null);
    try {
      await signInWithPassword(email, password);
      if (params.next === 'host') {
        router.replace('/host');
      } else if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch {
      setError(pick(COPY.failed, locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{pick(COPY.title, locale)}</Text>
        <Text style={styles.subtitle}>{pick(COPY.subtitle, locale)}</Text>
      </View>

      <AuthForm
        locale={locale}
        mode="sign-in"
        submitLabel={pick(COPY.submit, locale)}
        loading={loading}
        error={error}
        onSubmit={handleSubmit}
        footer={
          <View style={styles.footer}>
            <Text style={styles.footerText}>{pick(COPY.noAccount, locale)} </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.footerLink}>{pick(COPY.signUp, locale)}</Text>
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
});

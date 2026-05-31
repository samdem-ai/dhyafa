/**
 * Shared email + password form used by sign-in and sign-up.
 * Trilingual inline labels (ar/fr/en) since the shared @dyafa/i18n auth
 * namespace isn't extended here. RTL-aware text alignment.
 */

import { useState, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  I18nManager,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';
import { PrimaryButton, FieldLabel } from './ui';

const COPY = {
  email: { ar: 'البريد الإلكتروني', fr: 'E-mail', en: 'Email' },
  password: { ar: 'كلمة المرور', fr: 'Mot de passe', en: 'Password' },
  name: { ar: 'الاسم المعروض', fr: "Nom affiché", en: 'Display name' },
  emailPlaceholder: { ar: 'you@example.com', fr: 'you@example.com', en: 'you@example.com' },
} as const;

function pick(map: { ar: string; fr: string; en: string }, locale: Locale): string {
  return locale === 'fr' ? map.fr : locale === 'en' ? map.en : map.ar;
}

export interface AuthFormProps {
  locale: Locale;
  mode: 'sign-in' | 'sign-up';
  submitLabel: string;
  loading: boolean;
  error: string | null;
  onSubmit: (values: { email: string; password: string; displayName?: string }) => void;
  footer?: ReactNode;
}

export function AuthForm({
  locale,
  mode,
  submitLabel,
  loading,
  error,
  onSubmit,
  footer,
}: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const textAlign = I18nManager.isRTL ? 'right' : 'left';
  const canSubmit =
    email.trim().length > 3 &&
    password.length >= 6 &&
    (mode === 'sign-in' || displayName.trim().length > 0);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {mode === 'sign-up' && (
          <View style={styles.field}>
            <FieldLabel label={pick(COPY.name, locale)} />
            <TextInput
              style={[styles.input, { textAlign }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={pick(COPY.name, locale)}
              placeholderTextColor={theme.color.textMuted}
              autoCapitalize="words"
              accessibilityLabel={pick(COPY.name, locale)}
            />
          </View>
        )}

        <View style={styles.field}>
          <FieldLabel label={pick(COPY.email, locale)} />
          <TextInput
            style={[styles.input, { textAlign }]}
            value={email}
            onChangeText={setEmail}
            placeholder={pick(COPY.emailPlaceholder, locale)}
            placeholderTextColor={theme.color.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel={pick(COPY.email, locale)}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel label={pick(COPY.password, locale)} />
          <TextInput
            style={[styles.input, { textAlign }]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={theme.color.textMuted}
            secureTextEntry
            autoCapitalize="none"
            textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
            accessibilityLabel={pick(COPY.password, locale)}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.submit}>
          <PrimaryButton
            label={submitLabel}
            loading={loading}
            disabled={!canSubmit}
            onPress={() =>
              onSubmit({
                email,
                password,
                displayName: mode === 'sign-up' ? displayName : undefined,
              })
            }
          />
        </View>

        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: theme.space.xl,
    gap: theme.space.lg,
  },
  field: { gap: theme.space.xs },
  input: {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.md,
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
  },
  error: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.error,
    backgroundColor: theme.color.errorBg,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    textAlign: 'center',
  },
  submit: { marginTop: theme.space.sm },
});

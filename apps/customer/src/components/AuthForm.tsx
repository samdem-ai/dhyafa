/**
 * Shared email + password form used by sign-in and sign-up.
 * Trilingual inline labels (ar/fr/en) since the shared @dyafa/i18n auth
 * namespace isn't extended here. Built on the locale-aware @/ui primitives.
 */

import { useState, type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import type { Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { Button, TextField, Text } from '@/ui';

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
          <TextField
            label={pick(COPY.name, locale)}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={pick(COPY.name, locale)}
            autoCapitalize="words"
          />
        )}

        <TextField
          label={pick(COPY.email, locale)}
          value={email}
          onChangeText={setEmail}
          placeholder={pick(COPY.emailPlaceholder, locale)}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />

        <TextField
          label={pick(COPY.password, locale)}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          textContentType={mode === 'sign-up' ? 'newPassword' : 'password'}
        />

        {error ? (
          <Text variant="body-sm" color="error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.submit}>
          <Button
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
  error: {
    backgroundColor: theme.color.errorBg,
    padding: theme.space.md,
    borderRadius: theme.radius.md,
    textAlign: 'center',
  },
  submit: { marginTop: theme.space.sm },
});

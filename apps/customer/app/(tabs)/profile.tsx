/**
 * Profile tab (M2).
 *
 * Shows the signed-in user (or a sign-in CTA), shortcuts to Trips + Wishlists,
 * language picker, "Switch to Hosting" (auth-gated become_host → /host), and
 * sign-out. Reuses the host-entry mechanism from the previous home screen.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { useSession, signOut } from '@/lib/auth';
import { becomeHost } from '@/lib/listings';
import { PrimaryButton } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

function Row({
  glyph,
  label,
  value,
  onPress,
}: {
  glyph: string;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.rowGlyph}>{glyph}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Text style={styles.rowChevron}>{I18nManager.isRTL ? '‹' : '›'}</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { user, loading } = useSession();

  const [hosting, setHosting] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);

  async function onSwitchToHosting() {
    if (!user) {
      router.push({ pathname: '/(auth)/sign-in', params: { next: 'host' } });
      return;
    }
    setHosting(true);
    setHostError(null);
    try {
      await becomeHost();
      router.push('/host');
    } catch {
      setHostError(pick(L.loadError, locale));
    } finally {
      setHosting(false);
    }
  }

  const email = user?.email ?? null;
  const displayName =
    (user?.user_metadata?.['display_name'] as string | undefined) ?? email ?? pick(L.guest, locale);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{pick(L.profileTitle, locale)}</Text>
        </View>

        {/* Identity card */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarGlyph}>{user ? '🙂' : '👤'}</Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.identityName} numberOfLines={1}>
              {user ? displayName : pick(L.notSignedIn, locale)}
            </Text>
            {user && email ? (
              <Text style={styles.identitySub} numberOfLines={1}>
                {email}
              </Text>
            ) : (
              <Text style={styles.identitySub}>{pick(L.signInToBook, locale)}</Text>
            )}
          </View>
        </View>

        {!user && !loading ? (
          <View style={styles.signInWrap}>
            <PrimaryButton
              label={pick(L.signIn, locale)}
              onPress={() => router.push('/(auth)/sign-in')}
            />
          </View>
        ) : null}

        {/* Shortcuts */}
        <View style={styles.group}>
          <Row glyph="🧳" label={pick(L.myTrips, locale)} onPress={() => router.navigate('/(tabs)/trips')} />
          <Row
            glyph="🤍"
            label={pick(L.wishlists, locale)}
            value={pick(L.wishlistsSoon, locale)}
            onPress={() => router.navigate('/(tabs)/wishlists')}
          />
          <Row glyph="🌐" label={pick(L.language, locale)} onPress={() => router.push('/onboarding')} />
        </View>

        {/* Host entry */}
        <View style={styles.hostWrap}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onSwitchToHosting()}
            disabled={hosting || loading}
            style={({ pressed }) => [styles.hostCta, pressed && styles.pressed]}
          >
            {hosting ? (
              <ActivityIndicator color={theme.color.textOnPrimary} />
            ) : (
              <Text style={styles.hostCtaText}>🏡 {pick(L.switchToHosting, locale)}</Text>
            )}
          </Pressable>
          {hostError ? <Text style={styles.hostError}>{hostError}</Text> : null}
        </View>

        {/* Sign out */}
        {user ? (
          <View style={styles.signOutWrap}>
            <PrimaryButton
              label={pick(L.signOut, locale)}
              variant="secondary"
              onPress={() => void signOut()}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const textAlign = I18nManager.isRTL ? 'right' : 'left';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  scroll: { paddingBottom: theme.space['2xl'] },
  pressed: { opacity: 0.9 },

  header: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.lg, paddingBottom: theme.space.sm },
  title: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    color: theme.color.primary,
    textAlign,
  },

  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    marginHorizontal: theme.space.xl,
    marginTop: theme.space.md,
    padding: theme.space.lg,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    ...theme.shadow.card,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: { fontSize: 28 },
  identityText: { flex: 1 },
  identityName: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize['heading-3'],
    fontWeight: '600',
    color: theme.color.text,
    textAlign,
  },
  identitySub: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
    marginTop: 2,
    textAlign,
  },

  signInWrap: { marginHorizontal: theme.space.xl, marginTop: theme.space.lg },

  group: {
    marginHorizontal: theme.space.xl,
    marginTop: theme.space.lg,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.border,
  },
  rowGlyph: { fontSize: 20 },
  rowLabel: {
    flex: 1,
    fontFamily: RN_FONTS.arabicMedium,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
    textAlign,
  },
  rowValue: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize['body-sm'],
    color: theme.color.textMuted,
  },
  rowChevron: {
    fontFamily: RN_FONTS.bodyRegular,
    fontSize: theme.fontSize['heading-3'],
    color: theme.color.textMuted,
  },

  hostWrap: { marginHorizontal: theme.space.xl, marginTop: theme.space.xl },
  hostCta: {
    backgroundColor: theme.color.primary,
    borderRadius: theme.radius.md,
    paddingVertical: theme.space.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },
  hostCtaText: {
    fontFamily: RN_FONTS.arabicSemiBold,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    color: theme.color.textOnPrimary,
  },
  hostError: {
    fontFamily: RN_FONTS.arabicRegular,
    fontSize: theme.fontSize.caption,
    color: theme.color.error,
    textAlign: 'center',
    marginTop: theme.space.sm,
  },

  signOutWrap: { marginHorizontal: theme.space.xl, marginTop: theme.space.xl },
});

/**
 * Profile tab (M2; redesigned Phase 8).
 *
 * Shows the signed-in user (or a sign-in CTA), shortcuts to Trips + Wishlists,
 * language picker, "Switch to Hosting" (auth-gated become_host → /host), and
 * sign-out. Reuses the host-entry mechanism from the previous home screen.
 *
 * Redesign (Airbnb-style): clean list rows via the <ListItem> primitive with
 * Lucide outline icons (never emoji), an <Avatar> identity, <Heading> title, and
 * the action primitives. Generous whitespace, minimal elevation.
 */

import type { ComponentType } from 'react';
import { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Luggage, Heart, Globe, Home, type LucideProps } from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import { useSession, signOut } from '@/lib/auth';
import { ensureHostAndRefresh } from '@/lib/listings';
import { Heading, Text, Button, ListItem, Avatar, useToast } from '@/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';

/** Leading icon for a profile row — Lucide outline glyph in a faint sunken circle. */
function RowIcon({ icon: Icon }: { icon: ComponentType<LucideProps> }) {
  return (
    <View style={styles.rowIcon}>
      <Icon size={20} color={theme.color.primary} strokeWidth={2} />
    </View>
  );
}

export default function ProfileScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { user, loading } = useSession();

  const [hosting, setHosting] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const toast = useToast();

  async function onSwitchToHosting() {
    if (!user) {
      router.push({ pathname: '/(auth)/sign-in', params: { next: 'host' } });
      return;
    }
    setHosting(true);
    setHostError(null);
    try {
      // become_host (non-hosts only) + refreshSession so the host_id JWT claim
      // is minted before /host runs any host write (otherwise RLS-blocked).
      await ensureHostAndRefresh();
      setHosting(false);
      router.push('/host');
    } catch (e) {
      // Surface the failure visibly (toast) — the inline error is easy to miss.
      const msg = e instanceof Error && e.message ? e.message : pick(L.hostSwitchFailed, locale);
      setHostError(pick(L.hostSwitchFailed, locale));
      toast.show({ message: msg, tone: 'error' });
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
          <Heading level={1} color="primary">
            {pick(L.profileTitle, locale)}
          </Heading>
        </View>

        {/* Identity */}
        <View style={styles.identity}>
          <Avatar uri={null} name={user ? displayName : ''} size="lg" />
          <View style={styles.identityText}>
            <Text variant="title" weight="semibold" numberOfLines={1}>
              {user ? displayName : pick(L.notSignedIn, locale)}
            </Text>
            <Text variant="body-sm" color="textMuted" numberOfLines={1}>
              {user && email ? email : pick(L.signInToBook, locale)}
            </Text>
          </View>
        </View>

        {!user && !loading ? (
          <View style={styles.signInWrap}>
            <Button label={pick(L.signIn, locale)} onPress={() => router.push('/(auth)/sign-in')} />
          </View>
        ) : null}

        {/* Shortcuts */}
        <View style={styles.group}>
          <ListItem
            title={pick(L.myTrips, locale)}
            leading={<RowIcon icon={Luggage} />}
            onPress={() => router.navigate('/(tabs)/trips')}
          />
          <ListItem
            title={pick(L.wishlists, locale)}
            leading={<RowIcon icon={Heart} />}
            onPress={() => router.navigate('/(tabs)/wishlists')}
          />
          <ListItem
            title={pick(L.language, locale)}
            leading={<RowIcon icon={Globe} />}
            onPress={() => router.push('/onboarding')}
          />
        </View>

        {/* Host entry — brand (teal) mode switch. */}
        <View style={styles.hostWrap}>
          <Button
            label={pick(L.switchToHosting, locale)}
            variant="primary"
            icon={Home}
            loading={hosting}
            disabled={loading}
            onPress={() => void onSwitchToHosting()}
          />
          {hostError ? (
            <Text variant="caption" color="error" center style={styles.hostError}>
              {hostError}
            </Text>
          ) : null}
        </View>

        {/* Sign out */}
        {user ? (
          <View style={styles.signOutWrap}>
            <Button label={pick(L.signOut, locale)} variant="secondary" onPress={() => void signOut()} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  scroll: { paddingBottom: theme.space['2xl'] },

  header: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.sm,
  },

  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingHorizontal: theme.space.xl,
    marginTop: theme.space.md,
  },
  identityText: { flex: 1, gap: 2 },

  signInWrap: { marginHorizontal: theme.space.xl, marginTop: theme.space.lg },

  group: { marginTop: theme.space['2xl'] },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hostWrap: { marginHorizontal: theme.space.xl, marginTop: theme.space['2xl'] },
  hostError: { marginTop: theme.space.sm },

  signOutWrap: { marginHorizontal: theme.space.xl, marginTop: theme.space.lg },
});

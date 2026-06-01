/**
 * Wishlists tab — placeholder for M2.
 *
 * Favoriting/collections land in a later milestone; this is a designed empty
 * state so the tab exists and is navigable.
 */

import { View, Text, StyleSheet, SafeAreaView, I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { EmptyState } from '@/components/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

export default function WishlistsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'ar') as Locale;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{pick(L.wishlists, locale)}</Text>
      </View>
      <EmptyState emoji="🤍" title={pick(L.wishlists, locale)} subtitle={pick(L.wishlistsSoon, locale)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.lg },
  title: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    color: theme.color.primary,
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
});

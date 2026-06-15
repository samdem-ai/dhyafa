/**
 * Wishlists tab (Phase 5a).
 *
 * The signed-in user's saved properties, rendered with the SAME ResultCard the
 * search results use (so the heart, badges, price + tap-to-detail are identical).
 * FlashList + pull-to-refresh, a designed empty state ("Save places you love" →
 * Explore), skeletons while loading, and an error state. Signed-out users get a
 * sign-in prompt matching the other tabs.
 *
 * Data comes from useSavedProperties() (full PropertySummary[] for the saved ids)
 * which the wishlist heart's optimistic toggle invalidates, so removing a place
 * elsewhere reflects here on next focus/refresh.
 */

import { useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, I18nManager } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react-native';
import type { Locale } from '@dyafa/i18n';
import { useSession } from '@/lib/auth';
import { useSavedProperties } from '@/lib/queries';
import { ResultCard } from '@/components/discovery';
import type { PropertySummary } from '@/lib/discovery';
import {
  List,
  PropertyCardSkeleton,
  EmptyState,
  ErrorState,
  Text,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';

export default function WishlistsScreen() {
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  const { user, loading: sessionLoading } = useSession();

  const { data, isPending, isError, refetch, isRefetching } = useSavedProperties();

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{pick(L.wishlists, locale)}</Text>
      </View>

      {!user && !sessionLoading ? (
        <EmptyState
          icon={Heart}
          title={pick(L.wishlists, locale)}
          subtitle={pick(L.signInToSeeWishlists, locale)}
          action={{ label: pick(L.authSignInCta, locale), onPress: () => router.push('/(auth)/sign-in') }}
        />
      ) : isPending ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState
          message={pick(L.loadError, locale)}
          onRetry={() => void refetch()}
          retryLabel={pick(L.tryAgain, locale)}
        />
      ) : (
        <List<PropertySummary>
          data={data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={onRefresh}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          emptyComponent={
            <View style={styles.emptyWrap}>
              <EmptyState
                icon={Heart}
                title={pick(L.wishlistsEmptyTitle, locale)}
                subtitle={pick(L.wishlistsEmptyBody, locale)}
                action={{ label: pick(L.exploreStays, locale), onPress: () => router.push('/') }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <ResultCard
              property={item}
              locale={locale}
              onPress={() => router.push(`/property/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const textAlign = I18nManager.isRTL ? 'right' : 'left';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: { paddingHorizontal: theme.space.xl, paddingTop: theme.space.lg, paddingBottom: theme.space.sm },
  title: {
    fontFamily: RN_FONTS.displaySemiBold,
    fontSize: theme.fontSize['heading-1'],
    color: theme.color.primary,
    textAlign,
  },
  skeletonWrap: { padding: theme.space.lg, gap: theme.space.lg },
  listContent: { padding: theme.space.lg, flexGrow: 1 },
  sep: { height: theme.space.lg },
  emptyWrap: { flex: 1, paddingTop: theme.space['4xl'] },
});

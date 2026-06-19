/**
 * Wishlists tab (Phase 5a; redesigned Phase 8).
 *
 * The signed-in user's saved properties, rendered with the SAME ResultCard the
 * search results use. FlashList + pull-to-refresh, a designed empty state, and a
 * skeleton/error state. Signed-out users get a centered sign-in prompt.
 *
 * Data comes from useSavedProperties() (full PropertySummary[] for the saved ids)
 * which the wishlist heart's optimistic toggle invalidates.
 */

import { useCallback } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
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
  Heading,
} from '@/ui';
import { L, pick } from '@/lib/copy';
import { theme } from '@/theme';

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
        <Heading level={1} color="primary">
          {pick(L.wishlists, locale)}
        </Heading>
      </View>

      {!user && !sessionLoading ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon={Heart}
            title={pick(L.wishlists, locale)}
            subtitle={pick(L.signInToSeeWishlists, locale)}
            action={{ label: pick(L.authSignInCta, locale), onPress: () => router.push('/(auth)/sign-in') }}
          />
        </View>
      ) : isPending ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </View>
      ) : isError ? (
        <View style={styles.centerFill}>
          <ErrorState
            message={pick(L.loadError, locale)}
            onRetry={() => void refetch()}
            retryLabel={pick(L.tryAgain, locale)}
          />
        </View>
      ) : (
        <List<PropertySummary>
          data={data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={onRefresh}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          emptyComponent={
            <View style={styles.centerFill}>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.bg },
  header: {
    paddingHorizontal: theme.space.xl,
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.sm,
  },
  centerFill: { flex: 1, justifyContent: 'center' },
  skeletonWrap: { padding: theme.space.lg, gap: theme.space.lg },
  listContent: { padding: theme.space.lg, flexGrow: 1 },
  sep: { height: theme.space.lg },
});

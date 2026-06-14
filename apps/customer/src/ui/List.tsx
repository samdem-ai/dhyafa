/**
 * List — a FlashList preset that owns the common feed concerns: loading
 * skeleton, empty state, pull-to-refresh (teal), and onEndReached pagination
 * with a footer spinner. Use for every remote list (results, inbox,
 * reservations, reviews).
 *
 * Refreshable is the non-list counterpart: a teal RefreshControl factory for
 * ScrollViews (property detail, profile).
 */

import type { ReactElement, ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { FlashList, type FlashListProps } from '@shopify/flash-list';
import { theme } from '@/theme';

export interface ListProps<T> {
  data: T[];
  renderItem: FlashListProps<T>['renderItem'];
  keyExtractor?: (item: T, index: number) => string;
  /** Show the loading state instead of data (first load). */
  loading?: boolean;
  /** Element rendered while `loading` (skeleton preset). */
  loadingComponent?: ReactNode;
  /** Element rendered when data is empty and not loading. */
  emptyComponent?: ReactElement | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  /** Show a footer spinner (pagination in flight). */
  loadingMore?: boolean;
  header?: FlashListProps<T>['ListHeaderComponent'];
  numColumns?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  ItemSeparatorComponent?: FlashListProps<T>['ItemSeparatorComponent'];
  testID?: string;
}

export function List<T>({
  data,
  renderItem,
  keyExtractor,
  loading = false,
  loadingComponent,
  emptyComponent,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore = false,
  header,
  numColumns,
  contentContainerStyle,
  ItemSeparatorComponent,
  testID,
}: ListProps<T>) {
  if (loading) {
    return <View style={styles.fill}>{loadingComponent}</View>;
  }

  return (
    <FlashList
      testID={testID}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyComponent ?? undefined}
      ItemSeparatorComponent={ItemSeparatorComponent}
      contentContainerStyle={contentContainerStyle as object}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={theme.color.primary} />
          </View>
        ) : null
      }
      refreshControl={
        onRefresh
          ? (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor={theme.color.primary}
                colors={[theme.color.primary]}
              />
            )
          : undefined
      }
    />
  );
}

/** Teal RefreshControl for ScrollView-based screens. */
export function Refreshable({
  refreshing,
  onRefresh,
}: {
  refreshing: boolean;
  onRefresh: () => void;
}): ReactElement {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.color.primary}
      colors={[theme.color.primary]}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { paddingVertical: theme.space.xl, alignItems: 'center' },
});

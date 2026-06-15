/**
 * Header — a 56dp nav bar that respects the top safe-area inset.
 *
 * RTL-aware: the back chevron uses ChevronLeft and mirrors automatically under
 * RTL (so it points toward the writing-direction start). Supports a `rightSlot`
 * for actions and a `transparent` variant for image-overlay screens (property
 * gallery) where the back button sits on a scrim for contrast.
 */

import type { ReactNode } from 'react';
import { View, Pressable, StyleSheet, I18nManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { Locale } from '@dyafa/i18n';
import { theme } from '@/theme';
import { L, pick } from '@/lib/copy';
import { Heading } from './Text';
import { tap } from './haptics';

const BAR_HEIGHT = 56;

export interface HeaderProps {
  title?: string;
  /** Show the back chevron. Default true. */
  showBack?: boolean;
  /** Custom back handler (defaults to router.back()). */
  onBack?: () => void;
  /** Accessible label for the back button. */
  backLabel?: string;
  /** Right-aligned action(s). */
  rightSlot?: ReactNode;
  /** Transparent bar over media; renders a scrim chip behind the back button. */
  transparent?: boolean;
  testID?: string;
}

export function Header({
  title,
  showBack = true,
  onBack,
  backLabel,
  rightSlot,
  transparent = false,
  testID,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation('common');
  const locale = (i18n.language ?? 'en') as Locale;
  // Default the screen-reader back label to the localized "Go back"; an explicit
  // backLabel prop still overrides per-caller.
  const resolvedBackLabel = backLabel ?? pick(L.goBack, locale);

  function handleBack() {
    tap();
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
  }

  return (
    <View
      testID={testID}
      style={[
        styles.wrap,
        { paddingTop: insets.top },
        transparent ? styles.transparent : styles.solid,
      ]}
    >
      <View style={styles.bar}>
        <View style={styles.side}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={resolvedBackLabel}
              onPress={handleBack}
              hitSlop={8}
              style={[styles.backBtn, transparent && styles.backBtnScrim]}
            >
              <ChevronLeft
                size={26}
                color={transparent ? theme.color.textOnPrimary : theme.color.text}
                // Mirror the chevron under RTL so it points to the start edge.
                style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
              />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>

        <View style={styles.titleWrap}>
          {title ? (
            <Heading
              level={3}
              numberOfLines={1}
              center
              color={transparent ? 'textOnPrimary' : 'text'}
            >
              {title}
            </Heading>
          ) : null}
        </View>

        <View style={[styles.side, styles.sideEnd]}>{rightSlot}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  solid: {
    backgroundColor: theme.color.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.color.border,
  },
  transparent: { backgroundColor: 'transparent' },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.space.sm,
  },
  side: { minWidth: 44, justifyContent: 'center' },
  sideEnd: { alignItems: 'flex-end' },
  titleWrap: { flex: 1, justifyContent: 'center' },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  },
  backBtnScrim: { backgroundColor: theme.color.overlay },
});

/**
 * ListItem (Row) — leading slot · title + subtitle · trailing slot.
 *
 * Used for profile menus, settings, host menu, conversation list. Whole row is a
 * ≥44dp touch target when `onPress` is set; the optional chevron mirrors under
 * RTL so it points to the writing-direction end.
 */

import type { ReactNode } from 'react';
import { View, Pressable, StyleSheet, I18nManager, type ViewStyle, type StyleProp } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { theme } from '@/theme';
import { Text } from './Text';
import { tap } from './haptics';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Leading element (icon / avatar). */
  leading?: ReactNode;
  /** Trailing element (badge / value). Overrides the chevron. */
  trailing?: ReactNode;
  /** Show a chevron (default true when onPress is set and no trailing). */
  chevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Tone of the title (e.g. 'error' for destructive rows like Sign out). */
  titleColor?: keyof typeof theme.color;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  chevron,
  onPress,
  disabled = false,
  titleColor = 'text',
  style,
  testID,
}: ListItemProps) {
  const showChevron = (chevron ?? Boolean(onPress)) && !trailing;

  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <Text variant="body-lg" weight="medium" color={titleColor} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body-sm" color="textMuted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {showChevron ? (
        <ChevronRight
          size={20}
          color={theme.color.ink300}
          style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={[styles.row, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.md,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    backgroundColor: theme.color.surface,
  },
  pressed: { backgroundColor: theme.color.surfaceSunken },
  leading: { justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  trailing: { justifyContent: 'center' },
});

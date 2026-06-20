/**
 * SearchBar — a pill input with a leading search icon and an inline clear (×).
 * `returnKeyType='search'`. Can act as a read-only button (onPress) that opens
 * the search flow, or a live input (onChangeText).
 */

import type { ComponentType } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  I18nManager,
  type TextInputProps,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';
import { Text } from './Text';

export interface SearchBarProps {
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  onSubmit?: (text: string) => void;
  /** Read-only mode: the whole bar is a button (e.g. Explore hero → search flow). */
  onPress?: () => void;
  clearLabel?: string;
  /**
   * Input component to render (defaults to RN TextInput). Pass
   * `BottomSheetTextInput` from @gorhom/bottom-sheet when the SearchBar lives
   * inside a bottom sheet, otherwise the sheet's pan gesture swallows focus and
   * keystrokes.
   */
  inputComponent?: ComponentType<TextInputProps>;
  testID?: string;
}

export function SearchBar({
  value = '',
  onChangeText,
  placeholder,
  onSubmit,
  onPress,
  clearLabel = 'Clear',
  inputComponent: Input = TextInput,
  testID,
}: SearchBarProps) {
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        onPress={onPress}
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
      >
        <Search size={20} color={theme.color.textMuted} />
        <Text variant="body" color={value ? 'text' : 'textMuted'} style={styles.flex} numberOfLines={1}>
          {value || placeholder || ''}
        </Text>
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={styles.bar}>
      <Search size={20} color={theme.color.textMuted} />
      <Input
        style={[styles.input, { textAlign: I18nManager.isRTL ? 'right' : 'left', writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.color.textMuted}
        returnKeyType="search"
        onSubmitEditing={(e) => onSubmit?.(e.nativeEvent.text)}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => onChangeText?.('')}
          hitSlop={8}
        >
          <X size={18} color={theme.color.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    minHeight: 48,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.lg,
  },
  pressed: { backgroundColor: theme.color.surfaceSunken },
  flex: { flex: 1 },
  input: {
    flex: 1,
    paddingVertical: theme.space.sm,
    fontFamily: I18nManager.isRTL ? RN_FONTS.arabicRegular : RN_FONTS.bodyRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
  },
});

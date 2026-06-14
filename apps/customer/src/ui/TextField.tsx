/**
 * TextField — labeled text input.
 *
 * RTL fix: sets `writingDirection` (not just `textAlign`) so the Arabic cursor
 * and deletion behave correctly. Supports an error state (red border + message
 * announced via accessibilityLiveRegion), leading/trailing slots, and the usual
 * keyboard/autocomplete props. Superset-compatible with the legacy field API.
 */

import type { ReactNode } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  I18nManager,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { theme } from '@/theme';
import { RN_FONTS } from '@/lib/fonts';
import { Text } from './Text';
import { FieldLabel } from './FieldLabel';

export interface TextFieldProps {
  label?: string;
  hint?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Validation error — turns the border red and shows the message. */
  error?: string;
  secureTextEntry?: boolean;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  editable?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  testID?: string;
}

export function TextField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
  autoCapitalize = 'sentences',
  error,
  secureTextEntry,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  editable = true,
  leading,
  trailing,
  testID,
}: TextFieldProps) {
  const dir = I18nManager.isRTL ? 'rtl' : 'ltr';
  const align = I18nManager.isRTL ? 'right' : 'left';

  return (
    <View style={styles.field}>
      {label ? <FieldLabel label={label} hint={hint} /> : null}
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          error ? styles.inputWrapError : null,
          !editable && styles.inputWrapDisabled,
        ]}
      >
        {leading ? <View style={styles.affix}>{leading}</View> : null}
        <TextInput
          testID={testID}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { textAlign: align, writingDirection: dir },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.color.textMuted}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          accessibilityLabel={label}
        />
        {trailing ? <View style={styles.affix}>{trailing}</View> : null}
      </View>
      {error ? (
        <Text variant="caption" color="error" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.space.xs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.color.border,
    paddingHorizontal: theme.space.md,
  },
  inputWrapMultiline: { alignItems: 'flex-start' },
  inputWrapError: { borderColor: theme.color.error },
  inputWrapDisabled: { backgroundColor: theme.color.surfaceSunken, opacity: 0.7 },
  affix: { justifyContent: 'center' },
  input: {
    flex: 1,
    paddingVertical: theme.space.md,
    fontFamily: I18nManager.isRTL ? RN_FONTS.arabicRegular : RN_FONTS.bodyRegular,
    fontSize: theme.fontSize.body,
    color: theme.color.text,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
});

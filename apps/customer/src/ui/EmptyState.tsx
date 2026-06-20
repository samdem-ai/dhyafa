/**
 * EmptyState + ErrorState — full-content-area states with a Lucide icon inside a
 * tinted circle (no emoji), and a working Retry on the error variant.
 *
 * Both keep a SUPERSET of the legacy prop shapes so existing screens compile
 * unchanged:
 *   EmptyState: legacy { emoji?, title, subtitle? } + new { icon?, action? }
 *   ErrorState: legacy { message, onRetry?, retryLabel } + new { icon?, title? }
 */

import type { ComponentType } from 'react';
import { View, StyleSheet } from 'react-native';
import { Inbox, AlertTriangle, type LucideProps } from 'lucide-react-native';
import { theme } from '@/theme';
import { Heading, Text } from './Text';
import { Button } from './Button';

interface IconCircleProps {
  icon: ComponentType<LucideProps>;
  tone?: 'info' | 'error';
}

function IconCircle({ icon: Icon, tone = 'info' }: IconCircleProps) {
  const bg = tone === 'error' ? theme.color.errorBg : theme.color.infoBg;
  const fg = tone === 'error' ? theme.color.error : theme.color.primary;
  return (
    <View style={[styles.circle, { backgroundColor: bg }]}>
      <Icon size={32} color={fg} strokeWidth={1.75} />
    </View>
  );
}

export interface EmptyStateProps {
  title: string;
  subtitle?: string;
  /** New: a Lucide icon. Defaults to Inbox. The legacy `emoji` prop is ignored. */
  icon?: ComponentType<LucideProps>;
  /** Legacy emoji prop — accepted but not rendered (replaced by Lucide). */
  emoji?: string;
  /** Optional primary action. */
  action?: { label: string; onPress: () => void };
  testID?: string;
}

export function EmptyState({ title, subtitle, icon = Inbox, action, testID }: EmptyStateProps) {
  return (
    <View testID={testID} style={styles.wrap}>
      <IconCircle icon={icon} tone="info" />
      <Heading level={3} center>
        {title}
      </Heading>
      {subtitle ? (
        <Text variant="body" color="textMuted" center>
          {subtitle}
        </Text>
      ) : null}
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} fullWidth={false} style={styles.actionBtn} />
        </View>
      ) : null}
    </View>
  );
}

export interface ErrorStateProps {
  message: string;
  /** Optional heading above the message. */
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: ComponentType<LucideProps>;
  testID?: string;
}

export function ErrorState({
  message,
  title,
  onRetry,
  retryLabel,
  icon = AlertTriangle,
  testID,
}: ErrorStateProps) {
  return (
    <View testID={testID} style={styles.wrap}>
      <IconCircle icon={icon} tone="error" />
      {title ? (
        <Heading level={3} center>
          {title}
        </Heading>
      ) : null}
      <Text variant="body" color="textMuted" center>
        {message}
      </Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button label={retryLabel ?? 'Retry'} variant="secondary" onPress={onRetry} fullWidth={false} style={styles.actionBtn} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.space['2xl'],
    gap: theme.space.sm,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.sm,
  },
  action: { marginTop: theme.space.md, minWidth: 160, alignItems: 'center' },
  // Override Button's default alignSelf:'flex-start' so the CTA centers under
  // the title/subtitle instead of hugging the start edge.
  actionBtn: { alignSelf: 'center' },
});

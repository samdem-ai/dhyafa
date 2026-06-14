/**
 * Map — branded STUB with a stable API.
 *
 * The real interactive map (Mapbox / MapLibre) needs an expo-dev-client native
 * build and lands in Phase 4. Until then this renders a branded placeholder. The
 * public API (`markers`, `onMarkerPress`, `region`) is intentionally identical to
 * what the native implementation will accept, so the swap is a one-file change.
 *
 * DO NOT add native map deps here — keep this dependency-free.
 */

import { View, Pressable, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { theme } from '@/theme';
import { Heading, Text } from './Text';
import { PriceText } from './PriceText';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  /** Optional price shown on the pin (terracotta). */
  price?: number;
  label?: string;
}

export interface MapProps {
  markers?: MapMarker[];
  region?: MapRegion;
  onMarkerPress?: (id: string) => void;
  /** Stub copy. */
  title?: string;
  body?: string;
  testID?: string;
}

export function Map({ markers = [], onMarkerPress, title, body, testID }: MapProps) {
  return (
    <View testID={testID} style={styles.wrap}>
      <View style={styles.iconCircle}>
        <MapPin size={28} color={theme.color.primary} strokeWidth={1.75} />
      </View>
      {title ? (
        <Heading level={3} center>
          {title}
        </Heading>
      ) : null}
      {body ? (
        <Text variant="body-sm" color="textMuted" center style={styles.body}>
          {body}
        </Text>
      ) : null}

      {/* Listed pins as the accessible equivalent of the (deferred) map. */}
      <View style={styles.pins}>
        {markers.map((m) => (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityLabel={m.label}
            onPress={() => onMarkerPress?.(m.id)}
            style={styles.pin}
          >
            <MapPin size={16} color={theme.color.accent} />
            {typeof m.price === 'number' ? (
              <PriceText amount={m.price} variant="inline" />
            ) : m.label ? (
              <Text variant="body-sm">{m.label}</Text>
            ) : null}
          </Pressable>
        ))}
      </View>
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
    backgroundColor: theme.color.bg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.color.infoBg,
    marginBottom: theme.space.sm,
  },
  body: { maxWidth: 300 },
  pins: { marginTop: theme.space.lg, gap: theme.space.sm, alignSelf: 'stretch' },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
    alignSelf: 'center',
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space.md,
    paddingVertical: theme.space.sm,
    ...theme.shadow.pin,
  },
});

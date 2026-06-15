/**
 * Map — real Mapbox when available, branded stub fallback otherwise.
 *
 * @rnmapbox/maps is a NATIVE module: it only exists in a dev-client / production
 * build (see app.config.js + docs/rework-mobile/07-MAPBOX.md). In Expo Go the
 * native module is absent, so we detect that at module load and render the
 * branded stub instead — the app keeps working in Expo Go with zero map config.
 *
 * The public API (`markers`, `region`, `onMarkerPress`, stub `title`/`body`) is
 * identical across both paths, so callers don't branch.
 *
 * Tokens (never committed):
 *   EXPO_PUBLIC_MAPBOX_TOKEN  — public pk.… token, inlined by Metro, read here.
 *   RNMAPBOX_DOWNLOAD_TOKEN   — secret sk.… token, used only by the EAS build.
 */

import { View, Pressable, StyleSheet, NativeModules } from 'react-native';
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
  /** Stub copy (only shown on the fallback path). */
  title?: string;
  body?: string;
  testID?: string;
}

// ---------------------------------------------------------------------------
// Native-module detection (runs once at import). The @rnmapbox/maps native
// module registers under one of these names depending on arch/version; if none
// is present we are in Expo Go (or a build without the SDK) → use the stub.
// ---------------------------------------------------------------------------
const HAS_NATIVE =
  !!NativeModules.RNMBXModule || !!NativeModules.MGLModule || !!NativeModules.RCTMGLModule;

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

type MapboxModule = typeof import('@rnmapbox/maps');
let MB: MapboxModule | null = null;
if (HAS_NATIVE) {
  try {
    // Conditional require so Expo Go never executes Mapbox's native calls.
    MB = require('@rnmapbox/maps');
    if (MB && TOKEN) MB.default.setAccessToken(TOKEN);
  } catch {
    MB = null;
  }
}

/** Real map renders only when the native module loaded AND a public token exists. */
const USE_REAL = !!MB && !!TOKEN;

// Algiers — sensible default center when no markers/region are supplied.
const DEFAULT_CENTER: [number, number] = [3.0588, 36.7538];

function isValidCoord(m: MapMarker): boolean {
  return (
    Number.isFinite(m.latitude) &&
    Number.isFinite(m.longitude) &&
    !(m.latitude === 0 && m.longitude === 0)
  );
}

export function Map(props: MapProps) {
  if (USE_REAL && MB) return <RealMap {...props} mb={MB} />;
  return <MapStub {...props} />;
}

// ---------------------------------------------------------------------------
// Real Mapbox map
// ---------------------------------------------------------------------------
function RealMap({
  markers = [],
  region,
  onMarkerPress,
  testID,
  mb,
}: MapProps & { mb: MapboxModule }) {
  const { MapView, Camera, MarkerView } = mb;
  const pins = markers.filter(isValidCoord);
  const single = pins.length === 1 ? pins[0] : undefined;

  const center: [number, number] = region
    ? [region.longitude, region.latitude]
    : single
      ? [single.longitude, single.latitude]
      : DEFAULT_CENTER;

  // Fit all pins when there is more than one; otherwise zoom to the single point.
  const bounds =
    pins.length > 1
      ? {
          ne: [
            Math.max(...pins.map((p) => p.longitude)),
            Math.max(...pins.map((p) => p.latitude)),
          ] as [number, number],
          sw: [
            Math.min(...pins.map((p) => p.longitude)),
            Math.min(...pins.map((p) => p.latitude)),
          ] as [number, number],
        }
      : undefined;

  const zoom = region ? 12 : single ? 13 : 5;

  return (
    <View style={styles.fill} testID={testID}>
      <MapView style={styles.fill} styleURL={mb.StyleURL.Street} scaleBarEnabled={false}>
        <Camera
          defaultSettings={{ centerCoordinate: center, zoomLevel: zoom }}
          centerCoordinate={bounds ? undefined : center}
          zoomLevel={bounds ? undefined : zoom}
          bounds={
            bounds ? { ...bounds, paddingLeft: 48, paddingRight: 48, paddingTop: 48, paddingBottom: 48 } : undefined
          }
          animationDuration={0}
        />
        {pins.map((m) => (
          <MarkerView key={m.id} coordinate={[m.longitude, m.latitude]} anchor={{ x: 0.5, y: 1 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={m.label}
              onPress={() => onMarkerPress?.(m.id)}
              style={styles.pin}
            >
              {typeof m.price === 'number' ? (
                <PriceText amount={m.price} variant="inline" />
              ) : (
                <MapPin size={16} color={theme.color.accent} />
              )}
            </Pressable>
          </MarkerView>
        ))}
      </MapView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Branded stub (Expo Go / no token) — accessible list of pins as the equivalent.
// ---------------------------------------------------------------------------
function MapStub({ markers = [], onMarkerPress, title, body, testID }: MapProps) {
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
  fill: { flex: 1 },
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

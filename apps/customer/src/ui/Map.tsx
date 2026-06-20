/**
 * Map — a real interactive map via OpenStreetMap (free, no token, no native
 * build). Renders Leaflet + OSM raster tiles inside a react-native-webview, so
 * it works in Expo Go today. Property pins come from `markers`; tapping a pin
 * posts its id back → `onMarkerPress`.
 *
 * Coordinates are the privacy-safe approximate ones (≈110 m) from
 * properties_public — never the exact address.
 *
 * The public API (`markers`, `region`, `onMarkerPress`) is unchanged; the
 * `title`/`body` stub copy props are accepted but no longer used.
 */

import { useMemo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { theme } from '@/theme';

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
  /** Optional price shown on the pin. */
  price?: number;
  label?: string;
}

export interface MapProps {
  markers?: MapMarker[];
  region?: MapRegion;
  onMarkerPress?: (id: string) => void;
  /** Accepted for API compatibility (previously used by the stub). */
  title?: string;
  body?: string;
  testID?: string;
}

function isValid(m: MapMarker): boolean {
  return (
    Number.isFinite(m.latitude) &&
    Number.isFinite(m.longitude) &&
    !(m.latitude === 0 && m.longitude === 0)
  );
}

/** Build the Leaflet HTML document with the markers baked in. */
function buildHtml(markers: MapMarker[], region?: MapRegion): string {
  const pts = markers.filter(isValid).map((m) => ({
    id: m.id,
    lat: m.latitude,
    lng: m.longitude,
    // Keep the tooltip short; price already comes pre-rounded.
    label: m.price != null ? String(m.price) : (m.label ?? ''),
  }));
  const center = region
    ? [region.longitude, region.latitude]
    : null;
  const data = JSON.stringify(pts).replace(/</g, '\\u003c');
  const centerJson = JSON.stringify(center);

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#EFE9DF}
  .price-pill{background:#0E3A3A;color:#fff;font:600 12px -apple-system,system-ui,sans-serif;
    padding:3px 8px;border-radius:999px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.25)}
  .leaflet-control-attribution{font-size:9px}
</style></head>
<body><div id="map"></div>
<script>
  var pts = ${data};
  var center = ${centerJson};
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  function post(id){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(id); }
  var valid = pts.filter(function(p){ return typeof p.lat==='number' && typeof p.lng==='number'; });
  if (valid.length) {
    var layers = valid.map(function(p){
      var mk = p.label
        ? L.marker([p.lat,p.lng]).bindTooltip(p.label,{permanent:true,direction:'top',offset:[0,-8],className:'price-pill'})
        : L.marker([p.lat,p.lng]);
      mk.on('click', function(){ post(p.id); });
      return mk;
    });
    var group = L.featureGroup(layers).addTo(map);
    if (center) { map.setView([center[1],center[0]], 13); }
    else if (valid.length === 1) { map.setView([valid[0].lat, valid[0].lng], 13); }
    else { map.fitBounds(group.getBounds().pad(0.25)); }
  } else if (center) {
    map.setView([center[1],center[0]], 13);
  } else {
    map.setView([28.0339, 1.6596], 5); // Algeria
  }
</script></body></html>`;
}

export function Map({ markers = [], region, onMarkerPress, testID }: MapProps) {
  const html = useMemo(() => buildHtml(markers, region), [markers, region]);

  const onMessage = (e: WebViewMessageEvent) => {
    const id = e.nativeEvent.data;
    if (id) onMarkerPress?.(id);
  };

  return (
    <View style={styles.fill} testID={testID}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        style={styles.fill}
        // Let OSM/Leaflet load from the CDN.
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.color.primary} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.color.bg },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});

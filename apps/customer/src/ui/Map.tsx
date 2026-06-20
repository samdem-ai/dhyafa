/**
 * Map — a real interactive map via OpenStreetMap (free, no token, no native
 * build). Renders Leaflet + OSM raster tiles inside a react-native-webview, so
 * it works in Expo Go today.
 *
 * Two modes:
 *  - READ-ONLY (default): plots `markers`; tapping a pin → `onMarkerPress(id)`.
 *  - SELECTABLE (`onPress` provided): a tap drops/moves a draggable pin and
 *    reports the coordinate via `onPress(lat, lng)` — used by the host
 *    listing-location step to set the property's coordinates.
 *
 * Coordinates shown for guests are the privacy-safe approximate ones (≈110 m)
 * from properties_public — never the exact address.
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
  price?: number;
  label?: string;
}

export interface MapProps {
  markers?: MapMarker[];
  region?: MapRegion;
  onMarkerPress?: (id: string) => void;
  /** When set, the map is selectable: a tap drops a pin and reports its coords. */
  onPress?: (lat: number, lng: number) => void;
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

function buildHtml(markers: MapMarker[], region: MapRegion | undefined, selectable: boolean): string {
  const pts = markers.filter(isValid).map((m) => ({
    id: m.id,
    lat: m.latitude,
    lng: m.longitude,
    label: m.price != null ? String(m.price) : (m.label ?? ''),
  }));
  const center = region ? [region.longitude, region.latitude] : null;
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
  var selectable = ${selectable ? 'true' : 'false'};
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  function post(obj){ if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
  var valid = pts.filter(function(p){ return typeof p.lat==='number' && typeof p.lng==='number'; });

  if (selectable) {
    var pin = null;
    function place(lat,lng){
      if (pin) { pin.setLatLng([lat,lng]); }
      else {
        pin = L.marker([lat,lng], { draggable:true }).addTo(map);
        pin.on('dragend', function(e){ var p=e.target.getLatLng(); post({type:'press',lat:p.lat,lng:p.lng}); });
      }
    }
    map.on('click', function(e){ place(e.latlng.lat,e.latlng.lng); post({type:'press',lat:e.latlng.lat,lng:e.latlng.lng}); });
    if (valid.length) { place(valid[0].lat, valid[0].lng); map.setView([valid[0].lat, valid[0].lng], 13); }
    else if (center) { map.setView([center[1],center[0]], 12); }
    else { map.setView([28.0339, 1.6596], 5); }
  } else {
    if (valid.length) {
      var layers = valid.map(function(p){
        var mk = p.label
          ? L.marker([p.lat,p.lng]).bindTooltip(p.label,{permanent:true,direction:'top',offset:[0,-8],className:'price-pill'})
          : L.marker([p.lat,p.lng]);
        mk.on('click', function(){ post({type:'marker',id:p.id}); });
        return mk;
      });
      var group = L.featureGroup(layers).addTo(map);
      if (center) { map.setView([center[1],center[0]], 13); }
      else if (valid.length === 1) { map.setView([valid[0].lat, valid[0].lng], 13); }
      else { map.fitBounds(group.getBounds().pad(0.25)); }
    } else if (center) {
      map.setView([center[1],center[0]], 13);
    } else {
      map.setView([28.0339, 1.6596], 5);
    }
  }
</script></body></html>`;
}

export function Map({ markers = [], region, onMarkerPress, onPress, testID }: MapProps) {
  const selectable = !!onPress;
  // Memo on the INITIAL inputs only (selectable mode manages its pin in-webview,
  // so we don't reload on every coordinate change → no flicker).
  const html = useMemo(
    () => buildHtml(markers, region, selectable),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectable ? 'selectable' : JSON.stringify(markers), JSON.stringify(region)],
  );

  const onMessage = (e: WebViewMessageEvent) => {
    const raw = e.nativeEvent.data;
    try {
      const msg = JSON.parse(raw) as { type?: string; id?: string; lat?: number; lng?: number };
      if (msg.type === 'marker' && msg.id) onMarkerPress?.(msg.id);
      else if (msg.type === 'press' && typeof msg.lat === 'number' && typeof msg.lng === 'number') {
        onPress?.(msg.lat, msg.lng);
      }
    } catch {
      // Back-compat: a bare id string.
      if (raw) onMarkerPress?.(raw);
    }
  };

  return (
    <View style={styles.fill} testID={testID}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        style={styles.fill}
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

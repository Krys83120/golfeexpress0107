import React from "react";
import { View, StyleSheet, type DimensionValue } from "react-native";
import { WebView } from "react-native-webview";

export interface MapPinData {
  id: string;
  lat: number;
  lng: number;
  emoji: string;
  color: string;
  label: string;
}

interface ClientMapViewProps {
  pins: MapPinData[];
  onPinPress: (id: string) => void;
  height?: DimensionValue;
}

/**
 * Carte multi-commerçants via WebView + Leaflet — même approche que la
 * carte de suivi livreur (TrackingMap.tsx) : évite d'avoir à configurer
 * react-native-maps (clé API Google Maps, module natif, build EAS...) et
 * fonctionne directement dans Expo Go.
 *
 * La communication WebView -> React Native (quel pin a été tapé) passe par
 * window.ReactNativeWebView.postMessage, standard pour ce composant.
 */
export function ClientMapView({ pins, onPinPress }: ClientMapViewProps) {

  const center =
    pins.length > 0
      ? { lat: pins.reduce((s, p) => s + p.lat, 0) / pins.length, lng: pins.reduce((s, p) => s + p.lng, 0) / pins.length }
      : { lat: 43.3, lng: 6.64 }; // Golfe de Saint-Tropez, si aucun pin

  const markersJs = pins
    .map(
      (p) => `
    L.marker([${p.lat}, ${p.lng}], {
      icon: L.divIcon({
        className: '',
        html: '<div style="width:40px;height:40px;border-radius:999px;background:${p.color};display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:18px;">${p.emoji}</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })
    }).addTo(map).on('click', function() {
      window.ReactNativeWebView.postMessage(${JSON.stringify(p.id)});
    });`
    )
    .join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html, body, #map { height: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([${center.lat}, ${center.lng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    ${markersJs}
  </script>
</body>
</html>`;

  return (
    <View style={styles.wrap}>
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled
        originWhitelist={["*"]}
        onMessage={(event: { nativeEvent: { data: string } }) => onPinPress(event.nativeEvent.data)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});

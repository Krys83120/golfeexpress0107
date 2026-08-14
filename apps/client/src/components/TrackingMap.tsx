import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

interface TrackingMapProps {
  riderLat: number;
  riderLng: number;
  destinationLat?: number;
  destinationLng?: number;
  height?: number;
}

/**
 * Mini carte de suivi utilisant Leaflet plutôt que react-native-maps :
 * évite d'avoir à configurer un module natif (clé API Google Maps, build
 * EAS...) et fonctionne directement dans Expo Go, comme le reste de l'app.
 * Le HTML est généré côté client et injecté directement — pas de requête
 * réseau vers un serveur autre que les tuiles OpenStreetMap.
 *
 * IMPORTANT : react-native-webview ne supporte PAS la plateforme web
 * (affiche "React Native WebView does not support this platform" à la
 * place). Puisque cette app tourne aussi en PWA web, on bascule sur un
 * <iframe> natif du navigateur dans ce cas — même HTML, juste un conteneur
 * différent selon la plateforme.
 */
export function TrackingMap({ riderLat, riderLng, destinationLat, destinationLng, height = 180 }: TrackingMapProps) {
  const hasDestination = destinationLat !== undefined && destinationLng !== undefined;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .rider-pin {
      width: 34px; height: 34px; border-radius: 999px; background: #FF6B35;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 16px;
    }
    .dest-pin {
      width: 28px; height: 28px; border-radius: 999px; background: #1A1A2E;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); font-size: 13px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const riderIcon = L.divIcon({ className: '', html: '<div class="rider-pin">🛵</div>', iconSize: [34, 34], iconAnchor: [17, 17] });
    const destIcon = L.divIcon({ className: '', html: '<div class="dest-pin">📍</div>', iconSize: [28, 28], iconAnchor: [14, 14] });

    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${riderLat}, ${riderLng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const riderMarker = L.marker([${riderLat}, ${riderLng}], { icon: riderIcon }).addTo(map);

    ${
      hasDestination
        ? `
    const destMarker = L.marker([${destinationLat}, ${destinationLng}], { icon: destIcon }).addTo(map);
    const bounds = L.latLngBounds([[${riderLat}, ${riderLng}], [${destinationLat}, ${destinationLng}]]);
    map.fitBounds(bounds, { padding: [30, 30] });
    `
        : ""
    }

    // Permet de mettre à jour la position du livreur sans recharger toute
    // la page (appelé depuis React Native via postMessage/injectJavaScript
    // si on ajoute le rafraîchissement périodique plus tard).
    window.updateRiderPosition = function(lat, lng) {
      riderMarker.setLatLng([lat, lng]);
    };
  </script>
</body>
</html>`;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.wrap, { height }]}>
        {/* @ts-ignore — élément DOM natif, valide uniquement sur web (React Native Web) */}
        <iframe srcDoc={html} style={{ border: 0, width: "100%", height: "100%" }} title="Carte de suivi" />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        source={{ html }}
        style={{ flex: 1 }}
        scrollEnabled={false}
        javaScriptEnabled
        originWhitelist={["*"]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, overflow: "hidden" },
});

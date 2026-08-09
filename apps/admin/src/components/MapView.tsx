import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Le bundler (Vite) ne résout pas correctement les images référencées par
// Leaflet en interne — on reconstruit explicitement les icônes par défaut
// à partir des assets npm, sinon les pins s'affichent cassés (icône manquante).
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/** Centre approximatif du Golfe de Saint-Tropez, utilisé quand il n'y a aucun point à afficher. */
export const GOLFE_CENTER: [number, number] = [43.3, 6.64];

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  /** Couleur de fond du pin custom (sinon icône Leaflet par défaut). */
  color?: string;
  /** Emoji/texte affiché dans le pin custom. */
  label?: string;
  popupContent?: React.ReactNode;
}

function createColoredIcon(color: string, label?: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 32px; height: 32px; border-radius: 999px; background:${color};
      display:flex; align-items:center; justify-content:center;
      border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      font-size: 15px;
    ">${label ?? ""}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}

/** Recentre la carte quand la liste de points change (ex: premier chargement des données). */
function AutoFit({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [pins, map]);
  return null;
}

interface MapViewProps {
  pins: MapPin[];
  height?: number | string;
  emptyLabel?: string;
}

export function MapView({ pins, height = 260, emptyLabel = "Aucune position à afficher" }: MapViewProps) {
  if (pins.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-sm text-sm text-gris"
        style={{ height, backgroundColor: "#E8F5E9" }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div style={{ height, borderRadius: 8, overflow: "hidden" }}>
      <MapContainer center={GOLFE_CENTER} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoFit pins={pins} />
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={pin.color ? createColoredIcon(pin.color, pin.label) : undefined}
          >
            {pin.popupContent && <Popup>{pin.popupContent}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

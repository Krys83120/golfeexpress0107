import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useAddressStore } from "@/store/useAddressStore";

interface AddAddressFormProps {
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Géocodage rue/ville -> lat/lng (22/08/2026) via l'API Adresse du
 * gouvernement français (api-adresse.data.gouv.fr) — gratuite, sans clé,
 * déjà utilisée ailleurs dans l'app pour le géocodage inverse (voir
 * AddressPickerScreen.tsx -> handleUseCurrentLocation, GPS -> adresse).
 *
 * Corrige un bug important : jusqu'ici, TOUTE adresse ajoutée via ce
 * formulaire était enregistrée avec des coordonnées FIXES codées en dur
 * (centre de Sainte-Maxime), quelle que soit la rue/ville réellement
 * saisie. Resté invisible tant que les frais de livraison étaient un
 * montant fixe, ce bug faussait complètement le calcul dès que le
 * supplément par distance a été activé (22/08/2026) : deux adresses
 * différentes tapées ici tombaient toujours exactement à la même distance
 * du commerçant, donnant l'impression que le tarif restait figé quelle que
 * soit l'adresse choisie.
 */
async function geocodeAddress(street: string, zipCode: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({ q: `${street} ${city}`.trim(), limit: "1" });
  if (zipCode) params.set("postcode", zipCode);

  const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.toString()}`);
  const data = await response.json();
  const feature = data?.features?.[0];
  if (!feature?.geometry?.coordinates) return null;

  // Format GeoJSON : [longitude, latitude], dans cet ordre — inversé par
  // rapport à ce qu'attend le reste de l'app (lat, lng).
  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
}

export function AddAddressForm({ onClose, onCreated }: AddAddressFormProps) {
  const addAddress = useAddressStore((s) => s.addAddress);

  const [label, setLabel] = useState("");
  const [street, setStreet] = useState("");
  const [complement, setComplement] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("Sainte-Maxime");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!label.trim() || !street.trim() || !zipCode.trim() || !city.trim()) {
      setError("Merci de compléter au moins le libellé, la rue, le code postal et la ville.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const coords = await geocodeAddress(street.trim(), zipCode.trim(), city.trim());
      if (!coords) {
        setError(
          "Adresse introuvable — vérifiez l'orthographe de la rue et de la ville (ou utilisez plutôt \"Utiliser ma position actuelle\")."
        );
        return;
      }

      await addAddress({
        label: label.trim(),
        street: street.trim(),
        complement: complement.trim() || null,
        zipCode: zipCode.trim(),
        city: city.trim(),
        lat: coords.lat,
        lng: coords.lng,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter cette adresse.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 justify-end bg-black/40">
      <View className="rounded-t-2xl bg-white p-5 pb-8">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-heading text-lg font-bold text-nuit">Nouvelle adresse</Text>
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
            <Text style={{ fontSize: 14, color: "#1A1A2E" }}>✕</Text>
          </Pressable>
        </View>

        {error && (
          <View className="mb-3 rounded-sm bg-red-50 p-3">
            <Text className="text-[13px] text-red-500">{error}</Text>
          </View>
        )}

        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Libellé (ex: Maison, Bureau)"
          placeholderTextColor="#6B7280"
          className="mb-3 rounded-sm bg-gris-light px-4 py-3 font-body text-[15px] text-nuit"
        />
        <TextInput
          value={street}
          onChangeText={setStreet}
          placeholder="Rue"
          placeholderTextColor="#6B7280"
          className="mb-3 rounded-sm bg-gris-light px-4 py-3 font-body text-[15px] text-nuit"
        />
        <TextInput
          value={complement}
          onChangeText={setComplement}
          placeholder="Complément (étage, bâtiment...) — optionnel"
          placeholderTextColor="#6B7280"
          className="mb-3 rounded-sm bg-gris-light px-4 py-3 font-body text-[15px] text-nuit"
        />
        <View className="mb-4 flex-row gap-3">
          <TextInput
            value={zipCode}
            onChangeText={setZipCode}
            placeholder="Code postal"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            className="flex-1 rounded-sm bg-gris-light px-4 py-3 font-body text-[15px] text-nuit"
          />
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Ville"
            placeholderTextColor="#6B7280"
            className="flex-1 rounded-sm bg-gris-light px-4 py-3 font-body text-[15px] text-nuit"
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          className="items-center rounded bg-golfe-green py-4"
          style={{ opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? <ActivityIndicator color="white" /> : <Text className="text-base font-bold text-white">Enregistrer</Text>}
        </Pressable>
      </View>
    </View>
  );
}

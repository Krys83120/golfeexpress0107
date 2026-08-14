import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useAddressStore } from "@/store/useAddressStore";

interface AddAddressFormProps {
  onClose: () => void;
  onCreated: () => void;
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
      // NOTE: pas de géocodage automatique implémenté ici — on retombe sur
      // les coordonnées approximatives de Sainte-Maxime tant qu'aucun
      // service de géocodage (ex: Mapbox Geocoding API) n'est branché.
      // TODO: remplacer par un vrai géocodage à partir de street+city.
      await addAddress({
        label: label.trim(),
        street: street.trim(),
        complement: complement.trim() || null,
        zipCode: zipCode.trim(),
        city: city.trim(),
        lat: 43.3084,
        lng: 6.6391,
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

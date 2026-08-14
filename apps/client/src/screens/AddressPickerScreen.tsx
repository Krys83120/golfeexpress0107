import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useAddressStore } from "@/store/useAddressStore";
import { AddAddressForm } from "@/components/AddAddressForm";
import type { Address } from "@golfeexpress/types";

interface AddressPickerScreenProps {
  onClose: () => void;
  onSelected: (address: Address) => void;
}

const LABEL_EMOJIS: Record<string, string> = {
  Maison: "🏠",
  Bureau: "💼",
};

export function AddressPickerScreen({ onClose, onSelected }: AddressPickerScreenProps) {
  const addresses = useAddressStore((s) => s.addresses);
  const activeAddress = useAddressStore((s) => s.activeAddress);
  const setActiveAddress = useAddressStore((s) => s.setActiveAddress);
  const status = useAddressStore((s) => s.status);
  const error = useAddressStore((s) => s.error);
  const loadAddresses = useAddressStore((s) => s.loadAddresses);
  const removeAddress = useAddressStore((s) => s.removeAddress);
  const addAddress = useAddressStore((s) => s.addAddress);

  const [search, setSearch] = useState("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    loadAddresses();
  }, []);

  function handleSelect(address: Address) {
    setActiveAddress(address);
    onSelected(address);
  }

  /**
   * Géolocalise l'utilisateur (permission GPS), puis transforme les
   * coordonnées en vraie adresse postale via l'API gratuite et sans clé
   * api-adresse.data.gouv.fr (déjà utilisée ailleurs sur nos projets pour
   * du géocodage). L'adresse trouvée est enregistrée comme une adresse
   * normale, puis sélectionnée automatiquement.
   */
  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== "granted") {
        Alert.alert(
          "Localisation refusée",
          "Autorisez l'accès à votre position dans les réglages pour utiliser cette fonctionnalité."
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;

      const response = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${longitude}&lat=${latitude}`);
      const data = await response.json();
      const feature = data?.features?.[0];

      if (!feature) {
        Alert.alert("Adresse introuvable", "Impossible de déterminer une adresse à cet endroit précis.");
        return;
      }

      const props = feature.properties;
      await addAddress({
        label: "Position actuelle",
        street: props.name ?? props.label ?? "Adresse",
        zipCode: props.postcode ?? "",
        city: props.city ?? "",
        lat: latitude,
        lng: longitude,
        isDefault: addresses.length === 0,
      });

      // La nouvelle adresse vient d'être ajoutée au store — on la
      // sélectionne directement plutôt que de forcer l'utilisateur à la
      // rechercher dans la liste juste après l'avoir créée.
      const newlyAdded = useAddressStore.getState().addresses.at(-1);
      if (newlyAdded) handleSelect(newlyAdded);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de récupérer votre position. Vérifiez que le GPS est activé.");
    } finally {
      setLocating(false);
    }
  }

  async function handleDelete(addressId: string) {
    setDeletingId(addressId);
    try {
      await removeAddress(addressId);
    } catch {
      // Échec silencieux acceptable ici — l'adresse reste simplement affichée, le Client peut réessayer.
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = addresses.filter((a) =>
    `${a.label} ${a.street} ${a.city}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-5 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="font-heading text-xl font-bold text-nuit">📍 Choisir une adresse</Text>
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
          <Text style={{ fontSize: 14, color: "#1A1A2E" }}>✕</Text>
          </Pressable>
        </View>

        <View className="mb-4 flex-row items-center gap-3 rounded bg-gris-light px-4 py-3.5">
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher une adresse..."
            placeholderTextColor="#6B7280"
            className="flex-1 font-body text-[15px] text-nuit"
          />
        </View>

        <Pressable
          onPress={handleUseCurrentLocation}
          disabled={locating}
          className="mb-5 flex-row items-center gap-3 rounded-sm border-2 border-golfe-green/20 bg-golfe-green/5 p-4"
          style={{ opacity: locating ? 0.7 : 1 }}
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-golfe-green">
            {locating ? <ActivityIndicator size="small" color="white" /> : <Text style={{ fontSize: 16 }}>📍</Text>}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-nuit">Utiliser ma position actuelle</Text>
            <Text className="text-xs text-gris">{locating ? "Localisation en cours..." : "Géolocalisation GPS"}</Text>
          </View>
          <Text style={{ fontSize: 14, color: "#6B7280" }}>›</Text>
        </Pressable>

        <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-gris">
          Adresses enregistrées
        </Text>

        {status === "loading" && (
          <View className="items-center py-10">
            <ActivityIndicator color="#2ECC71" />
          </View>
        )}

        {status === "error" && (
          <View className="rounded-sm bg-red-50 p-4">
            <Text className="text-sm text-red-500">{error}</Text>
            <Pressable onPress={loadAddresses} className="mt-2">
              <Text className="text-sm font-semibold text-golfe-green">Réessayer</Text>
            </Pressable>
          </View>
        )}

        {status === "loaded" && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {filtered.map((address) => {
              const isActive = activeAddress?.id === address.id;
              const emoji = LABEL_EMOJIS[address.label] ?? "📍";
              return (
                <Pressable
                  key={address.id}
                  onPress={() => handleSelect(address)}
                  className="mb-3 flex-row items-center gap-3 rounded-sm border-2 p-4"
                  style={{
                    borderColor: isActive ? "#2ECC71" : "#F3F4F6",
                    backgroundColor: isActive ? "rgba(46,204,113,0.05)" : "white",
                  }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-gris-light">
                    <Text style={{ fontSize: 16 }}>{emoji}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-nuit">{address.label}</Text>
                    <Text className="text-xs text-gris">
                      {address.street}
                      {address.complement ? `, ${address.complement}` : ""} — {address.city}
                    </Text>
                  </View>
                  {isActive && <Text style={{ fontSize: 18, color: "#2ECC71" }}>✅</Text>}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleDelete(address.id);
                    }}
                    hitSlop={8}
                    className="ml-1 p-1"
                  >
                    {deletingId === address.id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <Text style={{ fontSize: 14 }}>🗑️</Text>
                    )}
                  </Pressable>
                </Pressable>
              );
            })}

            {filtered.length === 0 && addresses.length > 0 && (
              <View className="items-center py-10">
                <Text style={{ fontSize: 36 }}>🔍</Text>
                <Text className="mt-2 text-sm text-gris">Aucune adresse trouvée</Text>
              </View>
            )}

            {addresses.length === 0 && (
              <View className="items-center py-10">
                <Text style={{ fontSize: 36 }}>📍</Text>
                <Text className="mt-2 text-sm text-gris">Aucune adresse enregistrée encore</Text>
              </View>
            )}

            <Pressable
              onPress={() => setAddFormOpen(true)}
              className="mb-6 mt-2 flex-row items-center justify-center gap-2 rounded-sm border-2 border-dashed border-gris-light py-4"
            >
              <Text style={{ fontSize: 16, color: "#2ECC71" }}>➕</Text>
              <Text className="text-sm font-semibold text-golfe-green">Ajouter une nouvelle adresse</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>

      <Modal visible={addFormOpen} animationType="slide" transparent onRequestClose={() => setAddFormOpen(false)}>
        <AddAddressForm onClose={() => setAddFormOpen(false)} onCreated={() => setAddFormOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useAddressStore, GUEST_ADDRESS_ID } from "@/store/useAddressStore";
import { useAuthStore } from "@/store/useAuthStore";
import { AddAddressForm } from "@/components/AddAddressForm";
import { ApiRequestError } from "@/services/apiClient";
import type { Address } from "@golfeexpress/types";

interface AddressPickerScreenProps {
  onClose: () => void;
  onSelected: (address: Address) => void;
}

const LABEL_EMOJIS: Record<string, string> = {
  Maison: "🏠",
  Bureau: "💼",
};

interface GeocodeSuggestion {
  street: string;
  zipCode: string;
  city: string;
  lat: number;
  lng: number;
}

/** Géocodage direct (recherche par texte) -- même API que AddAddressForm.tsx
 * et handleUseCurrentLocation ci-dessous (gratuite, sans clé). Utilisée
 * uniquement en mode invité : pas de liste d'adresses enregistrées à filtrer
 * puisqu'il n'y en a pas sans compte, donc recherche = géocodage direct. */
async function searchAddressSuggestions(query: string): Promise<GeocodeSuggestion[]> {
  const params = new URLSearchParams({ q: query, limit: "5" });
  const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.toString()}`);
  const data = await response.json();
  const features: any[] = data?.features ?? [];
  return features
    .filter((f) => f?.geometry?.coordinates)
    .map((f) => {
      const props = f.properties ?? {};
      const [lng, lat] = f.geometry.coordinates;
      return {
        street: props.name ?? props.label ?? "Adresse",
        zipCode: props.postcode ?? "",
        city: props.city ?? "",
        lat,
        lng,
      };
    });
}

export function AddressPickerScreen({ onClose, onSelected }: AddressPickerScreenProps) {
  const addresses = useAddressStore((s) => s.addresses);
  const activeAddress = useAddressStore((s) => s.activeAddress);
  const setActiveAddress = useAddressStore((s) => s.setActiveAddress);
  const status = useAddressStore((s) => s.status);
  const error = useAddressStore((s) => s.error);
  const loadAddresses = useAddressStore((s) => s.loadAddresses);
  const removeAddress = useAddressStore((s) => s.removeAddress);
  const addAddress = useAddressStore((s) => s.addAddress);

  // Mode invité (19/09/2026) : un client sans compte peut aussi choisir une
  // adresse -- pour filtrer les commerçants affichés selon sa position, et
  // pré-remplir la commande une fois connecté au moment de payer (voir
  // CartScreen.tsx -> handleCheckout). Cette adresse reste purement locale
  // (GUEST_ADDRESS_ID) tant qu'aucun compte n'existe : on ne touche jamais à
  // GET/POST/DELETE /api/addresses (authentifiés) sans connexion.
  const authStatus = useAuthStore((s) => s.status);
  const isGuest = authStatus !== "authenticated";

  const [search, setSearch] = useState("");
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [guestSuggestions, setGuestSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [guestSearching, setGuestSearching] = useState(false);

  useEffect(() => {
    // On ne charge les adresses enregistrées que pour un client connecté --
    // GET /api/addresses est authentifié, l'appeler en mode invité ne
    // renverrait qu'un 401 (et déclencherait une déconnexion inutile via
    // apiFetch, voir apiClient.ts).
    if (!isGuest) loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]);

  useEffect(() => {
    if (!isGuest) return;
    const query = search.trim();
    if (query.length < 3) {
      setGuestSuggestions([]);
      setGuestSearching(false);
      return;
    }
    setGuestSearching(true);
    const timer = setTimeout(() => {
      searchAddressSuggestions(query)
        .then(setGuestSuggestions)
        .catch(() => setGuestSuggestions([]))
        .finally(() => setGuestSearching(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [search, isGuest]);

  function handleSelect(address: Address) {
    setActiveAddress(address);
    onSelected(address);
  }

  /** Sélection d'une suggestion géocodée en mode invité -- adresse purement
   * locale à cette session (voir GUEST_ADDRESS_ID), jamais envoyée à
   * /api/addresses. Si le client se connecte ensuite pour payer, elle est
   * automatiquement enregistrée pour de vrai (voir CartScreen.tsx). */
  function handleSelectGuestSuggestion(suggestion: GeocodeSuggestion) {
    handleSelect({
      id: GUEST_ADDRESS_ID,
      label: "Adresse de livraison",
      street: suggestion.street,
      complement: null,
      zipCode: suggestion.zipCode,
      city: suggestion.city,
      lat: suggestion.lat,
      lng: suggestion.lng,
      isDefault: false,
    });
  }

  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      // Sur web (notamment Safari iOS), la vérification de permission
      // séparée d'expo-location n'est pas fiable (l'API Permissions n'est
      // pas bien supportée) et peut refuser à tort. On saute donc cette
      // étape sur web : getCurrentPositionAsync déclenche directement le
      // prompt natif du navigateur, qui gère la permission lui-même. Sur
      // natif (iOS/Android), on garde la vérification explicite pour
      // afficher un message clair si refusée.
      if (Platform.OS !== "web") {
        const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
        if (permissionStatus !== "granted") {
          Alert.alert(
            "Localisation refusée",
            "Autorisez l'accès à votre position dans les réglages pour utiliser cette fonctionnalité."
          );
          return;
        }
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

      if (isGuest) {
        handleSelect({
          id: GUEST_ADDRESS_ID,
          label: "Position actuelle",
          street: props.name ?? props.label ?? "Adresse",
          complement: null,
          zipCode: props.postcode ?? "",
          city: props.city ?? "",
          lat: latitude,
          lng: longitude,
          isDefault: false,
        });
        return;
      }

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
      // Log conservé pour diagnostiquer plus précisément une prochaine fois
      // si le message générique ci-dessous ne suffit pas (refus navigateur
      // vs service de géocodage en échec vs GPS matériel indisponible).
      console.error("[AddressPicker] Erreur géolocalisation:", err);
      Alert.alert("Erreur", "Impossible de récupérer votre position. Vérifiez que le GPS est activé.");
    } finally {
      setLocating(false);
    }
  }

  async function handleDelete(addressId: string) {
    setDeletingId(addressId);
    try {
      await removeAddress(addressId);
    } catch (err) {
      // On affiche désormais l'erreur réelle (ex: "adresse utilisée par une
      // commande passée") au lieu de l'avaler en silence -- avant ce
      // correctif, l'adresse restait affichée après un clic sur la corbeille
      // sans aucune explication.
      const message =
        err instanceof ApiRequestError ? err.message : "Impossible de supprimer cette adresse pour le moment.";
      Alert.alert("Suppression impossible", message);
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
            placeholder={isGuest ? "Rechercher une ville, une rue..." : "Rechercher une adresse..."}
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

        {isGuest ? (
          <>
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-gris">Résultats</Text>

            {guestSearching && (
              <View className="items-center py-6">
                <ActivityIndicator color="#2ECC71" />
              </View>
            )}

            {!guestSearching && search.trim().length >= 3 && guestSuggestions.length === 0 && (
              <View className="items-center py-6">
                <Text className="text-sm text-gris">Aucune adresse trouvée.</Text>
              </View>
            )}

            {!guestSearching && search.trim().length < 3 && (
              <View className="items-center py-6">
                <Text style={{ fontSize: 32 }}>📍</Text>
                <Text className="mt-2 text-center text-sm text-gris">
                  Tapez au moins 3 lettres pour rechercher une adresse, ou utilisez votre position actuelle
                  ci-dessus.
                </Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {guestSuggestions.map((suggestion, i) => (
                <Pressable
                  key={`${suggestion.lat}-${suggestion.lng}-${i}`}
                  onPress={() => handleSelectGuestSuggestion(suggestion)}
                  className="mb-3 flex-row items-center gap-3 rounded-sm border-2 border-gris-light p-4"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-gris-light">
                    <Text style={{ fontSize: 16 }}>📍</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-nuit">{suggestion.street}</Text>
                    <Text className="text-xs text-gris">
                      {suggestion.zipCode} {suggestion.city}
                    </Text>
                  </View>
                </Pressable>
              ))}

              <View className="mb-6 mt-2 items-center rounded-sm bg-golfe-green/5 p-4">
                <Text className="text-center text-xs text-gris">
                  💡 Connectez-vous pour enregistrer vos adresses et les retrouver à chaque commande.
                </Text>
              </View>
            </ScrollView>
          </>
        ) : (
          <>
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
          </>
        )}
      </View>

      <Modal visible={addFormOpen} animationType="slide" transparent onRequestClose={() => setAddFormOpen(false)}>
        <AddAddressForm onClose={() => setAddFormOpen(false)} onCreated={() => setAddFormOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

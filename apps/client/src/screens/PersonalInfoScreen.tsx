import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { updateMyUserProfile } from "@/services/userApi";

interface PersonalInfoScreenProps {
  onClose: () => void;
}

export function PersonalInfoScreen({ onClose }: PersonalInfoScreenProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Le prénom et le nom sont requis.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await updateMyUserProfile({ firstName: firstName.trim(), lastName: lastName.trim() });
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'enregistrer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-5 pt-5">
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
            <Ionicons name="arrow-back" size={16} color="#1A1A2E" />
          </Pressable>
          <Text className="font-heading text-xl font-bold text-nuit">Informations personnelles</Text>
        </View>

        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold text-gris">Prénom</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            className="rounded-sm bg-gris-light px-4 py-3.5 text-[15px] text-nuit"
          />
        </View>

        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold text-gris">Nom</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            className="rounded-sm bg-gris-light px-4 py-3.5 text-[15px] text-nuit"
          />
        </View>

        <View className="mb-4">
          <Text className="mb-1.5 text-xs font-semibold text-gris">Email</Text>
          <View className="rounded-sm bg-gris-light px-4 py-3.5">
            <Text className="text-[15px] text-gris">{user?.email}</Text>
          </View>
          <Text className="mt-1 text-[11px] text-gris">L'email ne peut pas être modifié pour le moment.</Text>
        </View>

        <View className="mb-6">
          <Text className="mb-1.5 text-xs font-semibold text-gris">Téléphone</Text>
          <View className="rounded-sm bg-gris-light px-4 py-3.5">
            <Text className="text-[15px] text-gris">{user?.phone ?? "Non renseigné"}</Text>
          </View>
          <Text className="mt-1 text-[11px] text-gris">
            Contactez le support pour modifier votre numéro de téléphone (vérification requise).
          </Text>
        </View>

        {error && <Text className="mb-4 text-sm text-red-500">{error}</Text>}
        {saved && <Text className="mb-4 text-sm text-golfe-green">✅ Enregistré</Text>}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="items-center rounded-2xl bg-golfe-green py-4"
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-[15px] font-bold text-white">Enregistrer</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

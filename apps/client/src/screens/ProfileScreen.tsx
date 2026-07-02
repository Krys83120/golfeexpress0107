import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/useAuthStore";
import { AvatarUpload } from "@/components/AvatarUpload";
import { uploadAvatar, withCacheBust } from "@/services/uploadsApi";
import { updateMyUserProfile } from "@/services/userApi";

interface MenuRow {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
}

const ACCOUNT_ROWS: MenuRow[] = [
  { icon: "person-outline", label: "Informations personnelles" },
  { icon: "location-outline", label: "Mes adresses" },
  { icon: "card-outline", label: "Moyens de paiement" },
  { icon: "notifications-outline", label: "Notifications" },
];

const SUPPORT_ROWS: MenuRow[] = [
  { icon: "help-circle-outline", label: "Centre d'aide" },
  { icon: "chatbubble-ellipses-outline", label: "Contacter le support" },
  { icon: "document-text-outline", label: "Conditions générales" },
  { icon: "shield-checkmark-outline", label: "Confidentialité" },
];

interface ProfileScreenProps {
  onLogout: () => void | Promise<void>;
}

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const firstName = user?.firstName ?? "Utilisateur";
  const lastName = user?.lastName ?? "";

  async function handleAvatarUpload(localUri: string) {
    if (!user) return;
    const url = await uploadAvatar(user.id, localUri);
    const updated = await updateMyUserProfile({ avatar: withCacheBust(url) });
    setUser(updated);
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="items-center px-5 pb-2 pt-6">
          <AvatarUpload
            currentImageUrl={user?.avatar}
            initials={`${firstName[0]}${lastName[0] ?? ""}`}
            onUpload={handleAvatarUpload}
          />
          <Text className="mt-3 font-heading text-lg font-bold text-nuit">
            {firstName} {lastName}
          </Text>
          <Text className="text-sm text-gris">{user?.email}</Text>

          <Pressable className="mt-3 rounded-full border-2 border-gris-light px-4 py-2">
            <Text className="text-xs font-semibold text-nuit">Modifier le profil</Text>
          </Pressable>
        </View>

        <MenuSection title="Mon compte" rows={ACCOUNT_ROWS} />
        <MenuSection title="Aide & support" rows={SUPPORT_ROWS} />

        <View className="mt-6 px-5">
          <Pressable
            onPress={onLogout}
            className="flex-row items-center justify-center gap-2 rounded-sm border-2 border-red-100 bg-red-50 py-3.5"
          >
            <Ionicons name="log-out-outline" size={18} color="#F44336" />
            <Text className="text-sm font-bold text-red-500">Se déconnecter</Text>
          </Pressable>

          <Text className="mt-4 text-center text-xs text-gris">GolfeExpress v0.1.0 🦎</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuSection({ title, rows }: { title: string; rows: MenuRow[] }) {
  return (
    <View className="mt-6 px-5">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-gris">{title}</Text>
      <View className="rounded-sm bg-gris-light">
        {rows.map((row, index) => (
          <Pressable
            key={row.label}
            className="flex-row items-center gap-3 px-4 py-3.5"
            style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: "#E5E7EB" }}
          >
            <Ionicons name={row.icon} size={18} color={row.color ?? "#1A1A2E"} />
            <Text className="flex-1 text-sm text-nuit">{row.label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#6B7280" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

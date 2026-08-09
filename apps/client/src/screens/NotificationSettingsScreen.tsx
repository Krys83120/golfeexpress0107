import React from "react";
import { View, Text, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNotificationPrefsStore } from "@/store/useNotificationPrefsStore";

interface NotificationSettingsScreenProps {
  onClose: () => void;
}

const ROWS: { key: "orderUpdates" | "promotions" | "newRestaurants"; label: string; description: string }[] = [
  { key: "orderUpdates", label: "Suivi de commande", description: "Statut de préparation, livreur assigné, livraison" },
  { key: "promotions", label: "Promotions & bons plans", description: "Codes promo, offres spéciales" },
  { key: "newRestaurants", label: "Nouveaux commerçants", description: "Quand un nouveau commerçant ouvre près de chez vous" },
];

export function NotificationSettingsScreen({ onClose }: NotificationSettingsScreenProps) {
  const prefs = useNotificationPrefsStore();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-5 pt-5">
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
            <Ionicons name="arrow-back" size={16} color="#1A1A2E" />
          </Pressable>
          <Text className="font-heading text-xl font-bold text-nuit">🔔 Notifications</Text>
        </View>

        {ROWS.map((row) => (
          <View key={row.key} className="mb-3 flex-row items-center justify-between rounded-sm bg-gris-light p-4">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-bold text-nuit">{row.label}</Text>
              <Text className="mt-0.5 text-xs text-gris">{row.description}</Text>
            </View>
            <Switch
              value={prefs[row.key]}
              onValueChange={(value) => prefs.setPref(row.key, value)}
              trackColor={{ false: "#D1D5DB", true: "#2ECC71" }}
              thumbColor="white"
            />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

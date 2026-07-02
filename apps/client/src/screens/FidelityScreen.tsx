import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  MOCK_FIDELITY_REWARDS,
  MOCK_FIDELITY_HISTORY,
  FIDELITY_DEMO,
  type FidelityReward,
} from "@/services/mockFidelity";
import { useAuthStore } from "@/store/useAuthStore";

export function FidelityScreen() {
  const profile = useAuthStore((s) => s.profile);

  // currentPoints et referralCode viennent du vrai profil Client (API) ;
  // pointsToNextTier/nextTierName/récompenses/historique restent en mock —
  // aucune route API dédiée à la logique de paliers/récompenses pour
  // l'instant (TODO backend : GET /api/clients/me/fidelity).
  const currentPoints = profile?.fidelityPoints ?? 0;
  const referralCode = profile?.referralCode ?? "—";

  const progressRatio = currentPoints / (currentPoints + FIDELITY_DEMO.pointsToNextTier);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-2 pt-4">
          <Text className="font-heading text-xl font-bold text-nuit">🎁 Fidélité</Text>
        </View>

        {/* Points card */}
        <View className="mx-5 mt-3 rounded p-5" style={{ backgroundColor: "#1A1A2E" }}>
          <Text className="text-[13px] text-white/70">Vos points</Text>
          <Text className="mt-1 font-heading text-[36px] font-extrabold text-white">{currentPoints}</Text>

          <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
            <View
              className="h-full rounded-full bg-golfe-green"
              style={{ width: `${Math.min(100, progressRatio * 100)}%` }}
            />
          </View>
          <Text className="mt-2 text-xs text-white/60">
            {FIDELITY_DEMO.pointsToNextTier} points avant le {FIDELITY_DEMO.nextTierName} 🏆
          </Text>
        </View>

        {/* Referral */}
        <View className="mx-5 mt-4 flex-row items-center gap-3 rounded-sm bg-golfe-green/5 p-4">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-golfe-green">
            <Ionicons name="people" size={18} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-nuit">Parrainez un ami</Text>
            <Text className="text-xs text-gris">Gagnez 50 points chacun</Text>
          </View>
          <View className="rounded-sm bg-white px-3 py-2">
            <Text className="text-sm font-bold text-golfe-green">{referralCode}</Text>
          </View>
        </View>

        {/* Rewards */}
        <View className="mt-6 px-5">
          <Text className="mb-3 font-heading text-base font-bold text-nuit">🏅 Récompenses disponibles</Text>
          <View className="flex-row flex-wrap gap-3">
            {MOCK_FIDELITY_REWARDS.map((reward) => (
              <RewardCard key={reward.id} reward={reward} userPoints={currentPoints} />
            ))}
          </View>
        </View>

        {/* History */}
        <View className="mt-6 px-5">
          <Text className="mb-3 font-heading text-base font-bold text-nuit">📜 Historique</Text>
          {MOCK_FIDELITY_HISTORY.map((entry) => (
            <View key={entry.id} className="mb-2.5 flex-row items-center justify-between rounded-sm bg-gris-light p-3.5">
              <View>
                <Text className="text-sm font-medium text-nuit">{entry.label}</Text>
                <Text className="text-xs text-gris">{entry.dateLabel}</Text>
              </View>
              <Text
                className="text-sm font-bold"
                style={{ color: entry.points > 0 ? "#2ECC71" : "#F44336" }}
              >
                {entry.points > 0 ? "+" : ""}
                {entry.points} pts
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RewardCard({ reward, userPoints }: { reward: FidelityReward; userPoints: number }) {
  const isUnlocked = userPoints >= reward.pointsCost;
  return (
    <Pressable
      disabled={!isUnlocked}
      className="w-[47%] rounded-sm p-4"
      style={{ backgroundColor: isUnlocked ? "#E8F5E9" : "#F3F4F6", opacity: isUnlocked ? 1 : 0.6 }}
    >
      <Text style={{ fontSize: 28 }}>{reward.emoji}</Text>
      <Text className="mt-2 text-sm font-bold text-nuit">{reward.title}</Text>
      <Text className="mt-0.5 text-xs text-gris">{reward.description}</Text>
      <View className="mt-2.5 flex-row items-center gap-1">
        <Ionicons name="star" size={12} color={isUnlocked ? "#2ECC71" : "#6B7280"} />
        <Text className="text-xs font-bold" style={{ color: isUnlocked ? "#2ECC71" : "#6B7280" }}>
          {reward.pointsCost} pts
        </Text>
      </View>
    </Pressable>
  );
}

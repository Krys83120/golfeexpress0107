import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { FIDELITY_REWARDS, FIDELITY_TIER, type FidelityReward } from "@/services/fidelityCatalog";
import { fetchFidelityHistory, type FidelityHistoryEntry } from "@/services/fidelityApi";
import { useAuthStore } from "@/store/useAuthStore";

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isToday) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function FidelityScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [history, setHistory] = useState<FidelityHistoryEntry[]>([]);

  useEffect(() => {
    fetchFidelityHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  const currentPoints = profile?.fidelityPoints ?? 0;
  const referralCode = profile?.referralCode ?? "—";
  const [copied, setCopied] = useState(false);

  async function handleCopyCode() {
    if (referralCode === "—") return;
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const pointsRemaining = Math.max(0, FIDELITY_TIER.pointsToNextTier - currentPoints);
  const progressRatio = currentPoints / FIDELITY_TIER.pointsToNextTier;

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
            {pointsRemaining > 0
              ? `${pointsRemaining} points avant le ${FIDELITY_TIER.nextTierName} 🏆`
              : `${FIDELITY_TIER.nextTierName} débloqué 🏆`}
          </Text>
        </View>

        {/* Referral */}
        <View className="mx-5 mt-4 flex-row items-center gap-3 rounded-sm bg-golfe-green/5 p-4">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-golfe-green">
            <Text style={{ fontSize: 16 }}>👥</Text>
          </View>
          {/* minWidth: 0 est indispensable sur web : sans ça, un flex-1 ne
              se réduit jamais sous la largeur de son contenu (ici le texte),
              et se fait écraser par la boîte de code à droite qui, elle,
              garde sa largeur naturelle — d'où le texte qui retombe en
              colonne d'une lettre par ligne. */}
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Text className="text-sm font-bold text-nuit">Parrainez un ami</Text>
            <Text className="text-xs text-gris">Gagnez 50 points chacun</Text>
          </View>
          <View className="rounded-sm bg-white px-3 py-2" style={{ flexShrink: 0, maxWidth: 110 }}>
            <Text className="text-xs font-bold text-golfe-green" numberOfLines={1} ellipsizeMode="tail">
              {referralCode}
            </Text>
          </View>
        </View>
        <Pressable onPress={handleCopyCode} className="mx-5 mt-2 flex-row items-center justify-center gap-1.5 py-1">
          <Text style={{ fontSize: 12 }}>{copied ? "✅" : "📋"}</Text>
          <Text className="text-xs font-semibold text-golfe-green">
            {copied ? "Code copié !" : "Copier mon code de parrainage"}
          </Text>
        </Pressable>

        {/* Rewards */}
        <View className="mt-6 px-5">
          <Text className="mb-3 font-heading text-base font-bold text-nuit">🏅 Récompenses disponibles</Text>
          <View className="flex-row flex-wrap gap-3">
            {FIDELITY_REWARDS.map((reward) => (
              <RewardCard key={reward.id} reward={reward} userPoints={currentPoints} />
            ))}
          </View>
        </View>

        {/* History */}
        <View className="mt-6 px-5">
          <Text className="mb-3 font-heading text-base font-bold text-nuit">📜 Historique</Text>
          {history.length === 0 ? (
            <View className="items-center py-8">
              <Text style={{ fontSize: 32 }}>📦</Text>
              <Text className="mt-2 text-sm text-gris">Passez commande pour gagner vos premiers points</Text>
            </View>
          ) : (
            history.map((entry) => (
              <View key={entry.orderNumber} className="mb-2.5 flex-row items-center justify-between rounded-sm bg-gris-light p-3.5">
                <View>
                  <Text className="text-sm font-medium text-nuit">Commande {entry.orderNumber}</Text>
                  <Text className="text-xs text-gris">{formatDateLabel(entry.date)}</Text>
                </View>
                <Text className="text-sm font-bold text-golfe-green">+{entry.points} pts</Text>
              </View>
            ))
          )}
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
        <Text style={{ fontSize: 11 }}>⭐</Text>
        <Text className="text-xs font-bold" style={{ color: isUnlocked ? "#2ECC71" : "#6B7280" }}>
          {reward.pointsCost} pts
        </Text>
      </View>
    </Pressable>
  );
}

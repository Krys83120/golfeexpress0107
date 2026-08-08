import React, { useEffect } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MiniBarChart } from "@/components/MiniBarChart";
import { useRiderStatsStore } from "@/store/useRiderStatsStore";

/**
 * Badges dérivés des stats réelles (pas de table Badge en base) : chaque
 * seuil est évalué côté client à partir de totalDeliveries/rating. Simple et
 * suffisant tant qu'il n'y a pas besoin de badges "événementiels" custom.
 */
function computeBadges(totalDeliveries: number, rating: number | null) {
  return [
    { emoji: "🏆", title: "Top livreur", description: "100 livraisons effectuées", unlocked: totalDeliveries >= 100 },
    { emoji: "⚡", title: "Régulier", description: "500 livraisons effectuées", unlocked: totalDeliveries >= 500 },
    { emoji: "🌟", title: "5 étoiles", description: "Note moyenne ≥ 4.8", unlocked: (rating ?? 0) >= 4.8 },
    { emoji: "🎯", title: "Vétéran", description: "1000 livraisons effectuées", unlocked: totalDeliveries >= 1000 },
  ];
}

export function StatsScreen() {
  const { stats, status, load } = useRiderStatsStore();

  useEffect(() => {
    load();
  }, []);

  if (status === "loading" && !stats) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2ECC71" />
      </SafeAreaView>
    );
  }

  const badges = computeBadges(stats?.totalDeliveries ?? 0, stats?.rating ?? null);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-2 pt-4">
          <Text className="font-heading text-xl font-bold text-nuit">📊 Statistiques</Text>
          {stats && <Text className="text-xs text-gris">Membre depuis {stats.memberSinceLabel}</Text>}
        </View>

        {/* Key metrics */}
        <View className="mx-5 mt-4 flex-row flex-wrap gap-3">
          <MetricCard icon="🛵" value={String(stats?.totalDeliveries ?? 0)} label="Livraisons totales" />
          <MetricCard
            icon="⭐"
            value={stats?.rating != null ? stats.rating.toFixed(1) : "—"}
            label={`${stats?.ratingCount ?? 0} avis`}
          />
          <MetricCard
            icon="⏱️"
            value={stats?.avgDeliveryMinutes != null ? `${stats.avgDeliveryMinutes} min` : "—"}
            label="Temps moyen (7j)"
          />
        </View>

        {/* Weekly chart */}
        <View className="mx-5 mt-5 rounded-sm bg-gris-light p-4">
          <Text className="mb-3 font-heading text-base font-bold text-nuit">📈 Livraisons cette semaine</Text>
          <MiniBarChart data={stats?.weeklyDeliveries ?? []} />
        </View>

        {/* Badges */}
        <View className="mt-6 px-5">
          <Text className="mb-3 font-heading text-base font-bold text-nuit">🏅 Récompenses</Text>
          <View className="flex-row flex-wrap gap-3">
            {badges.map((badge) => (
              <View
                key={badge.title}
                className="w-[47%] rounded-sm p-4"
                style={{ backgroundColor: badge.unlocked ? "#E8F5E9" : "#F3F4F6", opacity: badge.unlocked ? 1 : 0.5 }}
              >
                <Text style={{ fontSize: 26 }}>{badge.emoji}</Text>
                <Text className="mt-2 text-sm font-bold text-nuit">{badge.title}</Text>
                <Text className="mt-0.5 text-xs text-gris">{badge.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View className="w-[47%] rounded-sm bg-gris-light p-4">
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text className="mt-2 font-heading text-xl font-extrabold text-nuit">{value}</Text>
      <Text className="mt-0.5 text-xs text-gris">{label}</Text>
    </View>
  );
}

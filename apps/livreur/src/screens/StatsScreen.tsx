import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MiniBarChart } from "@/components/MiniBarChart";
import { MOCK_WEEKLY_DELIVERIES, RIDER_STATS_SUMMARY, MOCK_RIDER_BADGES } from "@/services/mockStats";

export function StatsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-2 pt-4">
          <Text className="font-heading text-xl font-bold text-nuit">📊 Statistiques</Text>
          <Text className="text-xs text-gris">Membre depuis {RIDER_STATS_SUMMARY.memberSinceLabel}</Text>
        </View>

        {/* Key metrics */}
        <View className="mx-5 mt-4 flex-row flex-wrap gap-3">
          <MetricCard icon="🛵" value={String(RIDER_STATS_SUMMARY.totalDeliveries)} label="Livraisons totales" />
          <MetricCard icon="⭐" value={RIDER_STATS_SUMMARY.rating.toFixed(1)} label={`${RIDER_STATS_SUMMARY.ratingCount} avis`} />
          <MetricCard
            icon="✅"
            value={`${Math.round(RIDER_STATS_SUMMARY.acceptanceRate * 100)}%`}
            label="Taux d'acceptation"
          />
          <MetricCard
            icon="⏱️"
            value={`${RIDER_STATS_SUMMARY.avgDeliveryMinutes} min`}
            label="Temps moyen"
          />
        </View>

        {/* Weekly chart */}
        <View className="mx-5 mt-5 rounded-sm bg-gris-light p-4">
          <Text className="mb-3 font-heading text-base font-bold text-nuit">📈 Livraisons cette semaine</Text>
          <MiniBarChart data={MOCK_WEEKLY_DELIVERIES} />
        </View>

        {/* On-time rate */}
        <View className="mx-5 mt-5 rounded-sm bg-golfe-green/5 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-nuit">Livraisons à l'heure</Text>
            <Text className="text-sm font-bold text-golfe-green">
              {Math.round(RIDER_STATS_SUMMARY.onTimeRate * 100)}%
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <View
              className="h-full rounded-full bg-golfe-green"
              style={{ width: `${RIDER_STATS_SUMMARY.onTimeRate * 100}%` }}
            />
          </View>
        </View>

        {/* Badges */}
        <View className="mt-6 px-5">
          <Text className="mb-3 font-heading text-base font-bold text-nuit">🏅 Récompenses</Text>
          <View className="flex-row flex-wrap gap-3">
            {MOCK_RIDER_BADGES.map((badge) => (
              <View
                key={badge.title}
                className="w-[47%] rounded-sm p-4"
                style={{ backgroundColor: badge.unlocked ? "#E8F5E9" : "#F3F4F6", opacity: badge.unlocked ? 1 : 0.5 }}
              >
                <Text style={{ fontSize: 26 }}>{badge.emoji}</Text>
                <Text className="mt-2 text-sm font-bold text-nuit">{badge.title}</Text>
                <Text className="mt-0.5 text-xs text-gris">{badge.description}</Text>
                {!badge.unlocked && (
                  <View className="mt-2 flex-row items-center gap-1">
                    <Ionicons name="lock-closed" size={11} color="#6B7280" />
                    <Text className="text-[11px] text-gris">Verrouillé</Text>
                  </View>
                )}
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

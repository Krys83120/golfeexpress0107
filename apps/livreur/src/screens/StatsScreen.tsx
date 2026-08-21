import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Modal, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MiniBarChart } from "@/components/MiniBarChart";
import { useRiderStatsStore } from "@/store/useRiderStatsStore";
import { ReviewsScreen } from "@/screens/ReviewsScreen";

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
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    load();
  }, []);

  if (status === "loading" && !stats) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <ActivityIndicator color="#2ECC71" />
      </SafeAreaView>
    );
  }

  const badges = computeBadges(stats?.totalDeliveries ?? 0, stats?.rating ?? null);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.headerWrap}>
          <Text style={styles.headerTitle}>📊 Statistiques</Text>
          {stats && <Text style={styles.subtle}>Membre depuis {stats.memberSinceLabel}</Text>}
        </View>

        <View style={styles.metricsRow}>
          <MetricCard icon="🛵" value={String(stats?.totalDeliveries ?? 0)} label="Livraisons totales" />
          <MetricCard
            icon="⭐"
            value={stats?.rating != null ? stats.rating.toFixed(1) : "—"}
            label={`${stats?.ratingCount ?? 0} avis — voir le détail`}
            onPress={() => setShowReviews(true)}
          />
          <MetricCard
            icon="⏱️"
            value={stats?.avgDeliveryMinutes != null ? `${stats.avgDeliveryMinutes} min` : "—"}
            label="Temps moyen (7j)"
          />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>📈 Livraisons cette semaine</Text>
          <MiniBarChart data={stats?.weeklyDeliveries ?? []} />
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <Text style={styles.sectionTitle}>🏅 Récompenses</Text>
          <View style={styles.badgesRow}>
            {badges.map((badge) => (
              <View
                key={badge.title}
                style={[styles.badgeCard, { backgroundColor: badge.unlocked ? "#E8F5E9" : "#F3F4F6", opacity: badge.unlocked ? 1 : 0.5 }]}
              >
                <Text style={{ fontSize: 26 }}>{badge.emoji}</Text>
                <Text style={styles.badgeTitle}>{badge.title}</Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={showReviews} animationType="slide" onRequestClose={() => setShowReviews(false)}>
        <ReviewsScreen onClose={() => setShowReviews(false)} />
      </Modal>
    </SafeAreaView>
  );
}

function MetricCard({
  icon,
  value,
  label,
  onPress,
}: {
  icon: string;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  const Container = onPress ? Pressable : View;
  return (
    <Container style={styles.metricCard} onPress={onPress}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.subtle}>{label}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  headerWrap: { paddingHorizontal: 20, paddingBottom: 8, paddingTop: 16 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1A1A2E" },
  subtle: { fontSize: 12, color: "#6B7280" },
  metricsRow: { marginHorizontal: 20, marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { width: "47%", borderRadius: 8, backgroundColor: "#F3F4F6", padding: 16 },
  metricValue: { marginTop: 8, fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  chartCard: { marginHorizontal: 20, marginTop: 20, borderRadius: 8, backgroundColor: "#F3F4F6", padding: 16 },
  sectionTitle: { marginBottom: 12, fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  badgeCard: { width: "47%", borderRadius: 8, padding: 16 },
  badgeTitle: { marginTop: 8, fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  badgeDesc: { marginTop: 2, fontSize: 12, color: "#6B7280" },
});

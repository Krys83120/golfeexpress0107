import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Review } from "@golfeexpress/types";
import { fetchMyReviews } from "@/services/ridersApi";

interface ReviewsScreenProps {
  onClose: () => void;
}

function Stars({ rating }: { rating: number }) {
  return (
    <Text style={{ fontSize: 13 }}>
      {"⭐".repeat(Math.max(0, Math.min(5, Math.round(rating))))}
    </Text>
  );
}

/**
 * "Mes avis" — miroir côté livreur de la page "Avis clients" déjà présente
 * dans l'app Pro (apps/pro/src/pages/ReviewsPage.tsx) : moyenne, répartition
 * par étoiles, puis la liste des commentaires. Contrairement au Pro, le
 * livreur ne peut pas répondre à un avis (pas de fonctionnalité prévue côté
 * client pour ça) — lecture seule.
 *
 * On affiche riderRating (la note spécifique à la livraison), pas `rating`
 * qui note le commerçant — voir GET /api/riders/me/reviews qui ne renvoie
 * que les avis où riderRating est renseigné.
 */
export function ReviewsScreen({ onClose }: ReviewsScreenProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    try {
      const data = await fetchMyReviews();
      setReviews(data);
      setStatus("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger vos avis.");
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const ratings = reviews.map((r) => r.riderRating ?? 0).filter((r) => r > 0);
  const average = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of ratings) distribution[r] = (distribution[r] ?? 0) + 1;

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⭐ Mes avis</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={{ fontSize: 14, color: "#1A1A2E" }}>✕</Text>
        </Pressable>
      </View>

      {status === "loading" && reviews.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#2ECC71" />
        </View>
      ) : status === "error" ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: "#EF4444", fontSize: 13 }}>{error}</Text>
          <Pressable onPress={load} style={{ marginTop: 8 }}>
            <Text style={{ color: "#2ECC71", fontWeight: "700", fontSize: 13 }}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={styles.summaryRow}>
            <View style={styles.averageCard}>
              <Text style={styles.averageValue}>{average.toFixed(1)}</Text>
              <Stars rating={average} />
              <Text style={styles.subtle}>{ratings.length} avis</Text>
            </View>
            <View style={styles.distributionCard}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star] ?? 0;
                const pct = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
                return (
                  <View key={star} style={styles.distRow}>
                    <Text style={styles.distLabel}>{star}★</Text>
                    <View style={styles.distTrack}>
                      <View style={[styles.distFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.distCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {reviews.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#6B7280", marginTop: 32, fontSize: 13 }}>
              Aucun avis pour le moment.
            </Text>
          ) : (
            <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 8 }}>
              {reviews.map((review) => {
                const clientName = review.client?.user
                  ? `${review.client.user.firstName} ${review.client.user.lastName}`
                  : "Client";
                return (
                  <View key={review.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewName}>{clientName}</Text>
                      <Stars rating={review.riderRating ?? 0} />
                    </View>
                    <Text style={styles.subtle}>
                      {new Date(review.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                    </Text>
                    {review.riderComment && <Text style={styles.reviewComment}>{review.riderComment}</Text>}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  closeBtn: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  subtle: { fontSize: 12, color: "#6B7280" },
  summaryRow: { flexDirection: "row", gap: 12, marginHorizontal: 20, marginTop: 8 },
  averageCard: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    padding: 16,
    alignItems: "flex-start",
  },
  averageValue: { fontSize: 30, fontWeight: "800", color: "#1A1A2E" },
  distributionCard: { flex: 2, borderRadius: 8, backgroundColor: "#F3F4F6", padding: 16, justifyContent: "center" },
  distRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  distLabel: { width: 22, fontSize: 11, color: "#6B7280" },
  distTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "#E5E7EB", overflow: "hidden" },
  distFill: { height: "100%", borderRadius: 3, backgroundColor: "#FF6B35" },
  distCount: { width: 22, textAlign: "right", fontSize: 11, color: "#6B7280" },
  reviewCard: { borderRadius: 8, backgroundColor: "#F3F4F6", padding: 16 },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  reviewName: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  reviewComment: { marginTop: 8, fontSize: 13, color: "#1A1A2E" },
});

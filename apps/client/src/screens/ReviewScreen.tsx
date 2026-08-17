import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Share, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Order } from "@golfeexpress/types";
import { createReview, fetchOrderReview } from "@/services/reviewsApi";

interface ReviewScreenProps {
  order: Order;
  onClose: () => void;
}

interface StarRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function StarRow({ label, value, onChange }: StarRowProps) {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starRowLabel}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
            <Text style={{ fontSize: 26, color: n <= value ? "#FF6B35" : "#E5E7EB" }}>★</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Écran de notation post-livraison — ouvert soit depuis "Mes commandes"
 * (bouton "Avis" sur une commande livrée), soit via le lien
 * ?screen=review&orderId=... du mail "Commande livrée" (voir App.tsx).
 * Une seule note par commande (orderId est unique côté API) : si un avis
 * existe déjà, on l'affiche en lecture seule plutôt que de permettre un
 * second envoi.
 */
export function ReviewScreen({ order, onClose }: ReviewScreenProps) {
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const [productRating, setProductRating] = useState(0);
  const [proRating, setProRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [platformRating, setPlatformRating] = useState(0);
  const [comment, setComment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const hasRider = !!order.riderId;

  useEffect(() => {
    fetchOrderReview(order.id)
      .then((existing) => {
        if (existing) setAlreadyReviewed(true);
      })
      .catch(() => {
        // Pas bloquant — si la vérification échoue, on laisse simplement le
        // formulaire ouvert ; un doublon serait de toute façon refusé par l'API.
      })
      .finally(() => setLoadingExisting(false));
  }, [order.id]);

  const canSubmit = productRating > 0 && proRating > 0 && platformRating > 0 && (!hasRider || riderRating > 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await createReview(order.id, {
        productRating,
        proRating,
        riderRating: hasRider ? riderRating : undefined,
        platformRating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer votre avis pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    try {
      const productNames = order.items?.map((i) => i.productName).join(", ");
      await Share.share({
        message: `Je viens de commander ${productNames ? `${productNames} ` : ""}chez ${
          order.pro?.businessName ?? "un commerçant local"
        } avec Do You Geckoo, livré en moins de 30 minutes. À essayer : https://www.doyougeckoo.fr`,
      });
    } catch {
      // Partage annulé/impossible — pas grave, on n'affiche pas d'erreur pour ça.
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
        <Text className="font-heading text-xl font-bold text-nuit">⭐ Votre avis</Text>
        <Pressable onPress={onClose}>
          <Text style={{ fontSize: 15, color: "#6B7280" }}>Fermer</Text>
        </Pressable>
      </View>

      {loadingExisting ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#2ECC71" />
        </View>
      ) : alreadyReviewed && !submitted ? (
        <View className="items-center px-8 py-16">
          <Text style={{ fontSize: 40 }}>🙏</Text>
          <Text className="mt-3 text-center text-gris">Vous avez déjà laissé un avis pour cette commande — merci !</Text>
        </View>
      ) : submitted ? (
        <View className="items-center px-8 py-16">
          <Text style={{ fontSize: 40 }}>🎉</Text>
          <Text className="mt-3 text-center font-heading text-lg font-bold text-nuit">Merci pour votre avis !</Text>
          <Text className="mt-2 text-center text-sm text-gris">
            Ça aide {order.pro?.businessName ?? "ce commerçant"} et votre livreur à s'améliorer.
          </Text>
          <Pressable onPress={handleShare} className="mt-6 rounded-full bg-golfe-green px-6 py-3">
            <Text className="text-sm font-bold text-nuit">📤 Partager Do You Geckoo</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
          <Text className="mb-4 text-sm text-gris">
            Commande {order.orderNumber} chez {order.pro?.businessName ?? "ce commerçant"}
          </Text>

          <StarRow label="Le produit" value={productRating} onChange={setProductRating} />
          <StarRow label={order.pro?.businessName ?? "Le commerçant"} value={proRating} onChange={setProRating} />
          {hasRider && <StarRow label="Le livreur" value={riderRating} onChange={setRiderRating} />}
          <StarRow label="Do You Geckoo" value={platformRating} onChange={setPlatformRating} />

          <Text className="mb-2 mt-4 text-xs font-semibold text-nuit">Un commentaire ? (optionnel)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Votre expérience en quelques mots..."
            multiline
            numberOfLines={3}
            style={styles.commentInput}
          />

          {error && <Text className="mt-3 text-sm text-red-500">{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{
              marginTop: 20,
              borderRadius: 999,
              backgroundColor: "#2ECC71",
              paddingVertical: 14,
              alignItems: "center",
              opacity: !canSubmit || submitting ? 0.5 : 1,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#1A1A2E" }}>{submitting ? "Envoi..." : "Envoyer mon avis"}</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  starRow: { marginBottom: 18 },
  starRowLabel: { marginBottom: 8, fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  commentInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 80,
  },
});
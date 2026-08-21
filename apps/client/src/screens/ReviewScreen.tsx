import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Share, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Order } from "@golfeexpress/types";
import { createReview, fetchOrderReview, type CreateReviewInput } from "@/services/reviewsApi";

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
          <Pressable key={n} onPress={() => onChange(n === value ? 0 : n)} hitSlop={6}>
            <Text style={{ fontSize: 26, color: n <= value ? "#FF6B35" : "#E5E7EB" }}>★</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Une cible de note indépendante (commerçant / livreur / plateforme / un produit) — sa propre note + son propre commentaire, jamais partagé avec les autres. */
interface TargetCardProps {
  label: string;
  sublabel?: string;
  rating: number;
  onRatingChange: (value: number) => void;
  comment: string;
  onCommentChange: (value: string) => void;
  commentPlaceholder: string;
}

function TargetCard({ label, sublabel, rating, onRatingChange, comment, onCommentChange, commentPlaceholder }: TargetCardProps) {
  return (
    <View style={styles.targetCard}>
      <StarRow label={label} value={rating} onChange={onRatingChange} />
      {sublabel && <Text style={styles.targetSublabel}>{sublabel}</Text>}
      {rating > 0 && (
        <TextInput
          value={comment}
          onChangeText={onCommentChange}
          placeholder={commentPlaceholder}
          multiline
          numberOfLines={2}
          style={styles.commentInput}
        />
      )}
    </View>
  );
}

/**
 * Écran de notation post-livraison — ouvert soit depuis "Mes commandes"
 * (bouton "Avis" sur une commande livrée), soit via le lien
 * ?screen=review&orderId=... du mail "Commande livrée" (voir App.tsx).
 *
 * Chaque cible (commerçant, livreur, plateforme, chaque produit acheté) est
 * INDÉPENDANTE : sa propre note, son propre commentaire, et le client
 * choisit librement lesquelles remplir — rien n'est obligatoire à part
 * laisser au moins une note au total. Voir POST /api/orders/[orderId]/review.
 *
 * Une seule note par commande (orderId est unique côté API pour le volet
 * pro/livreur/plateforme, et un ProductReview par produit) : si un avis
 * existe déjà, on l'affiche en lecture seule plutôt que de permettre un
 * second envoi.
 */
export function ReviewScreen({ order, onClose }: ReviewScreenProps) {
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const [proRating, setProRating] = useState(0);
  const [proComment, setProComment] = useState("");
  const [riderRating, setRiderRating] = useState(0);
  const [riderComment, setRiderComment] = useState("");
  const [platformRating, setPlatformRating] = useState(0);
  const [platformComment, setPlatformComment] = useState("");
  const [productRatings, setProductRatings] = useState<Record<string, number>>({});
  const [productComments, setProductComments] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const hasRider = !!order.riderId;

  // Un produit peut apparaître plusieurs fois dans order.items (options
  // différentes) — on ne veut qu'une seule carte de notation par produit.
  const uniqueProducts = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of order.items ?? []) {
      if (!seen.has(item.productId)) seen.set(item.productId, item.productName);
    }
    return Array.from(seen, ([productId, productName]) => ({ productId, productName }));
  }, [order.items]);

  useEffect(() => {
    fetchOrderReview(order.id)
      .then(({ review, productReviews }) => {
        if (review || productReviews.length > 0) setAlreadyReviewed(true);
      })
      .catch(() => {
        // Pas bloquant — si la vérification échoue, on laisse simplement le
        // formulaire ouvert ; un doublon serait de toute façon refusé par l'API.
      })
      .finally(() => setLoadingExisting(false));
  }, [order.id]);

  const canSubmit =
    proRating > 0 ||
    (hasRider && riderRating > 0) ||
    platformRating > 0 ||
    Object.values(productRatings).some((r) => r > 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const input: CreateReviewInput = {};
      if (proRating > 0) input.pro = { rating: proRating, comment: proComment.trim() || undefined };
      if (hasRider && riderRating > 0) input.rider = { rating: riderRating, comment: riderComment.trim() || undefined };
      if (platformRating > 0) input.platform = { rating: platformRating, comment: platformComment.trim() || undefined };
      const productEntries = Object.entries(productRatings).filter(([, r]) => r > 0);
      if (productEntries.length > 0) {
        input.products = productEntries.map(([productId, rating]) => ({
          productId,
          rating,
          comment: productComments[productId]?.trim() || undefined,
        }));
      }
      await createReview(order.id, input);
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
          <Text className="mb-1 text-sm text-gris">
            Commande {order.orderNumber} chez {order.pro?.businessName ?? "ce commerçant"}
          </Text>
          <Text className="mb-4 text-xs text-gris">
            Notez ce que vous voulez — un seul aspect ou plusieurs, chacun avec son propre commentaire.
          </Text>

          <TargetCard
            label={order.pro?.businessName ?? "Le commerçant"}
            rating={proRating}
            onRatingChange={setProRating}
            comment={proComment}
            onCommentChange={setProComment}
            commentPlaceholder="Votre avis sur le commerçant..."
          />

          {hasRider && (
            <TargetCard
              label="Le livreur"
              rating={riderRating}
              onRatingChange={setRiderRating}
              comment={riderComment}
              onCommentChange={setRiderComment}
              commentPlaceholder="Votre avis sur la livraison..."
            />
          )}

          <TargetCard
            label="Do You Geckoo"
            sublabel="Votre expérience globale avec l'application"
            rating={platformRating}
            onRatingChange={setPlatformRating}
            comment={platformComment}
            onCommentChange={setPlatformComment}
            commentPlaceholder="Votre avis sur l'application..."
          />

          {uniqueProducts.length > 0 && (
            <>
              <Text className="mb-2 mt-2 text-xs font-bold uppercase tracking-wide text-gris">Les produits achetés</Text>
              {uniqueProducts.map((product) => (
                <TargetCard
                  key={product.productId}
                  label={product.productName}
                  rating={productRatings[product.productId] ?? 0}
                  onRatingChange={(value) =>
                    setProductRatings((prev) => ({ ...prev, [product.productId]: value }))
                  }
                  comment={productComments[product.productId] ?? ""}
                  onCommentChange={(value) =>
                    setProductComments((prev) => ({ ...prev, [product.productId]: value }))
                  }
                  commentPlaceholder="Votre avis sur ce produit (goût, qualité...)"
                />
              ))}
            </>
          )}

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
  targetCard: {
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    padding: 14,
  },
  targetSublabel: { marginTop: -10, marginBottom: 10, fontSize: 11, color: "#6B7280" },
  starRow: { marginBottom: 4 },
  starRowLabel: { marginBottom: 8, fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  commentInput: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 60,
  },
});

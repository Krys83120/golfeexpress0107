import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OrderStatus } from "@golfeexpress/types";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";
import { getCategoryEmoji } from "@/services/categoryVisuals";

const STEP_LABELS = ["Assignée", "Récupérée", "En route", "Livrée"];
const DELIVERY_FLOW: OrderStatus[] = [
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
];

const ACTION_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.RIDER_ASSIGNED]: "📦 J'ai récupéré la commande",
  [OrderStatus.PICKED_UP]: "📍 J'arrive chez le client",
  [OrderStatus.IN_DELIVERY]: "🎉 Commande livrée !",
} as Record<OrderStatus, string>;

/**
 * Ouvre l'app de navigation (Google Maps sur Android, Apple/Google Maps au
 * choix de l'utilisateur sur iOS) avec un itinéraire vers les coordonnées
 * données. On utilise le schéma d'URL universel Google Maps (fonctionne
 * aussi bien en ouvrant l'app native si installée qu'en fallback web sinon).
 */
function openDirections(lat: number, lng: number, label?: string) {
  const query = `${lat},${lng}`;
  const url =
    Platform.OS === "ios"
      ? `maps://?daddr=${query}&dirflg=d`
      : `google.navigation:q=${query}&mode=d`;
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}${
    label ? `&destination_place_id=${encodeURIComponent(label)}` : ""
  }`;

  Linking.canOpenURL(url)
    .then((supported) => Linking.openURL(supported ? url : fallbackUrl))
    .catch(() => Linking.openURL(fallbackUrl));
}

export function CurrentDeliveryCard() {
  const activeDelivery = useRiderSessionStore((s) => s.activeDelivery);
  const advanceDeliveryStep = useRiderSessionStore((s) => s.advanceDeliveryStep);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!activeDelivery) return null;

  const stepIndex = DELIVERY_FLOW.indexOf(activeDelivery.status);
  const emoji = activeDelivery.pro ? getCategoryEmoji(activeDelivery.pro.category) : "🏪";
  const routeLabel = `${activeDelivery.fromAddress?.city ?? "?"} → ${activeDelivery.toAddress?.city ?? "?"}`;

  // Avant récupération -> direction le commerçant. Après -> direction le client.
  const isHeadingToPickup = activeDelivery.status === OrderStatus.RIDER_ASSIGNED;
  const destinationAddress = isHeadingToPickup ? activeDelivery.fromAddress : activeDelivery.toAddress;

  // Cas de la recherche anticipée : le livreur a été assigné PENDANT la
  // préparation et peut être en route, mais la commande n'est pas encore
  // physiquement prête (le Pro n'a pas encore cliqué "Marquer prête") — on
  // bloque l'action "récupéré" tant que ce n'est pas le cas, pour éviter
  // une confirmation prématurée.
  const isWaitingForFoodToBeReady = activeDelivery.status === OrderStatus.RIDER_ASSIGNED && !activeDelivery.readyAt;

  async function handleAction() {
    setError(null);
    setSubmitting(true);
    try {
      await advanceDeliveryStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDirections() {
    if (!destinationAddress) return;
    openDirections(Number(destinationAddress.lat), Number(destinationAddress.lng), destinationAddress.street);
  }

  return (
    <View style={[styles.card, { backgroundColor: "#1A1A2E" }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🛵 Livraison en cours</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeDelivery.orderNumber}</Text>
        </View>
      </View>

      <View style={styles.proRow}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 24 }}>{emoji}</Text>
        </View>
        <View>
          <Text style={styles.proName}>{activeDelivery.pro?.businessName ?? "Commerçant"}</Text>
          <Text style={styles.routeLabel}>{routeLabel}</Text>
        </View>
        <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
          <Text style={styles.earnings}>{Number(activeDelivery.riderEarnings).toFixed(2).replace(".", ",")}€</Text>
        </View>
      </View>

      {destinationAddress && (
        <Pressable onPress={handleDirections} style={styles.directionsBtn}>
          <Ionicons name="navigate" size={16} color="#1A1A2E" />
          <Text style={styles.directionsText}>
            {isHeadingToPickup ? "Itinéraire vers le commerçant" : "Itinéraire vers le client"}
          </Text>
        </Pressable>
      )}

      {isWaitingForFoodToBeReady && (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingText}>👨‍🍳 Commande en préparation — vous pouvez déjà vous mettre en route</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.stepsRow}>
        {STEP_LABELS.map((label, i) => {
          const isCompleted = i < stepIndex;
          const isActive = i === stepIndex;
          return (
            <View key={label} style={styles.step}>
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: isCompleted ? "#2ECC71" : isActive ? "#FF6B35" : "rgba(255,255,255,0.1)" },
                ]}
              >
                {isCompleted && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={[styles.stepLabel, { color: isCompleted || isActive ? "white" : "rgba(255,255,255,0.5)" }]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={handleAction}
        disabled={submitting || isWaitingForFoodToBeReady}
        style={[styles.actionBtn, { opacity: submitting || isWaitingForFoodToBeReady ? 0.5 : 1 }]}
      >
        <Text style={styles.actionText}>
          {isWaitingForFoodToBeReady ? "⏳ En attente que ce soit prêt..." : ACTION_LABELS[activeDelivery.status] ?? "Continuer"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 20 },
  headerRow: { marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: "700", color: "white" },
  badge: { borderRadius: 999, backgroundColor: "#F97316", paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "white" },
  proRow: { marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { height: 50, width: 50, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#F97316" },
  proName: { fontWeight: "700", color: "white" },
  routeLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  earnings: { fontSize: 20, fontWeight: "800", color: "white" },
  directionsBtn: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "white",
    paddingVertical: 12,
  },
  directionsText: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  waitingBox: { marginBottom: 16, borderRadius: 8, backgroundColor: "rgba(255,107,53,0.15)", padding: 12 },
  waitingText: { fontSize: 13, fontWeight: "600", color: "#FF6B35" },
  errorBox: { marginBottom: 12, borderRadius: 4, backgroundColor: "rgba(239,68,68,0.1)", padding: 12 },
  errorText: { fontSize: 13, color: "#FCA5A5" },
  stepsRow: { marginBottom: 16, flexDirection: "row", justifyContent: "space-between" },
  step: { flex: 1, alignItems: "center" },
  stepDot: { height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  stepLabel: { marginTop: 4, textAlign: "center", fontSize: 10 },
  actionBtn: { alignItems: "center", borderRadius: 8, backgroundColor: "#2ECC71", paddingVertical: 14 },
  actionText: { fontWeight: "700", color: "white" },
});

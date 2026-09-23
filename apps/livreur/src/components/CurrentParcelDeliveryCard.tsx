import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking, Platform } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { ParcelOrderStatus } from "@golfeexpress/types";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";

const STEP_LABELS = ["Assignée", "Récupéré", "En route", "Livré"];
const DELIVERY_FLOW: ParcelOrderStatus[] = [
  ParcelOrderStatus.RIDER_ASSIGNED,
  ParcelOrderStatus.PICKED_UP,
  ParcelOrderStatus.IN_DELIVERY,
  ParcelOrderStatus.DELIVERED,
];

const ACTION_LABELS: Partial<Record<ParcelOrderStatus, string>> = {
  [ParcelOrderStatus.RIDER_ASSIGNED]: "📦 J'ai récupéré le colis",
  [ParcelOrderStatus.PICKED_UP]: "📍 Je suis en route",
  [ParcelOrderStatus.IN_DELIVERY]: "🎉 Colis livré !",
};

function openDirections(lat: number, lng: number, label?: string) {
  const query = `${lat},${lng}`;
  const url = Platform.OS === "ios" ? `maps://?daddr=${query}&dirflg=d` : `google.navigation:q=${query}&mode=d`;
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}${
    label ? `&destination_place_id=${encodeURIComponent(label)}` : ""
  }`;
  Linking.canOpenURL(url)
    .then((supported) => Linking.openURL(supported ? url : fallbackUrl))
    .catch(() => Linking.openURL(fallbackUrl));
}

function callRecipient(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

/** Chrono "mm:ss" écoulé depuis riderAssignedAt -- même helper que CurrentDeliveryCard.tsx. */
function formatElapsed(riderAssignedAt: string): string {
  const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(riderAssignedAt).getTime()) / 1000));
  const h = Math.floor(elapsedSec / 3600);
  const m = Math.floor((elapsedSec % 3600) / 60);
  const s = elapsedSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Version Colis Express de CurrentDeliveryCard.tsx -- finition du workflow
 * Livreur (23/09/2026). Volontairement plus simple que son équivalent
 * commandes classiques :
 *  - pas de code/photo de remise obligatoire (aucun mécanisme équivalent
 *    côté serveur, voir parcel-orders/status/route.ts -- juste un statut) ;
 *  - pas de "commande en préparation" à attendre (une demande CONFIRMED est
 *    immédiatement prête, voir parcel-orders/route.ts) ;
 *  - pas de signalement (OrderReport est spécifique aux commandes
 *    classiques, voir reportsApi.ts -- pas d'équivalent Colis Express).
 */
export function CurrentParcelDeliveryCard() {
  const activeParcelDelivery = useRiderSessionStore((s) => s.activeParcelDelivery);
  const advanceParcelDeliveryStep = useRiderSessionStore((s) => s.advanceParcelDeliveryStep);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  // Écran gardé allumé pendant la course -- même raison que CurrentDeliveryCard.tsx.
  useKeepAwake();

  useEffect(() => {
    if (!activeParcelDelivery?.riderAssignedAt) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [activeParcelDelivery?.riderAssignedAt]);

  if (!activeParcelDelivery) return null;

  const stepIndex = DELIVERY_FLOW.indexOf(activeParcelDelivery.status);
  const routeLabel = `${activeParcelDelivery.fromAddress?.city ?? "?"} → ${activeParcelDelivery.toAddress?.city ?? "?"}`;

  // Avant récupération -> direction la boutique du Pro. Après -> direction le destinataire.
  const isHeadingToPickup = activeParcelDelivery.status === ParcelOrderStatus.RIDER_ASSIGNED;
  const destinationAddress = isHeadingToPickup ? activeParcelDelivery.fromAddress : activeParcelDelivery.toAddress;

  const canCallRecipient =
    activeParcelDelivery.status === ParcelOrderStatus.PICKED_UP ||
    activeParcelDelivery.status === ParcelOrderStatus.IN_DELIVERY;

  async function handleAction() {
    setError(null);
    setSubmitting(true);
    try {
      await advanceParcelDeliveryStep();
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
        <Text style={styles.title}>📦 Colis Express en cours</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeParcelDelivery.parcelNumber}</Text>
        </View>
      </View>

      <View style={styles.proRow}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 24 }}>🏪</Text>
        </View>
        <View>
          <Text style={styles.proName}>{activeParcelDelivery.pro?.businessName ?? "Commerçant"}</Text>
          <Text style={styles.routeLabel}>{routeLabel}</Text>
        </View>
        <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
          <Text style={styles.earnings}>{Number(activeParcelDelivery.riderEarnings).toFixed(2).replace(".", ",")}€</Text>
        </View>
      </View>

      {activeParcelDelivery.riderAssignedAt && (
        <View style={styles.chronoBox}>
          <Text style={styles.chronoText}>🕐 Chrono : {formatElapsed(activeParcelDelivery.riderAssignedAt)}</Text>
        </View>
      )}

      {activeParcelDelivery.instructions && (
        <View style={styles.instructionsBox}>
          <Text style={styles.instructionsText}>💬 {activeParcelDelivery.instructions}</Text>
        </View>
      )}

      {destinationAddress && (
        <Pressable onPress={handleDirections} style={styles.directionsBtn}>
          <Text style={{ fontSize: 16 }}>🧭</Text>
          <Text style={styles.directionsText}>
            {isHeadingToPickup ? "Itinéraire vers le commerçant" : "Itinéraire vers le destinataire"}
          </Text>
        </Pressable>
      )}

      {canCallRecipient && (
        <Pressable
          onPress={() => callRecipient(activeParcelDelivery.recipientPhone)}
          style={[styles.directionsBtn, styles.callBtn]}
        >
          <Text style={{ fontSize: 16 }}>📞</Text>
          <Text style={[styles.directionsText, { color: "white" }]}>
            Appeler {activeParcelDelivery.recipientName}
          </Text>
        </Pressable>
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
                  { backgroundColor: isCompleted ? "#2ECC71" : isActive ? "#2196F3" : "rgba(255,255,255,0.1)" },
                ]}
              >
                {isCompleted && <Text style={{ fontSize: 14, color: "white", fontWeight: "700" }}>✓</Text>}
              </View>
              <Text style={[styles.stepLabel, { color: isCompleted || isActive ? "white" : "rgba(255,255,255,0.5)" }]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      <Pressable onPress={handleAction} disabled={submitting} style={[styles.actionBtn, { opacity: submitting ? 0.5 : 1 }]}>
        <Text style={styles.actionText}>{ACTION_LABELS[activeParcelDelivery.status] ?? "Continuer"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 20 },
  headerRow: { marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: "700", color: "white" },
  badge: { borderRadius: 999, backgroundColor: "#2196F3", paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "white" },
  proRow: { marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { height: 50, width: 50, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#2196F3" },
  proName: { fontWeight: "700", color: "white" },
  routeLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  earnings: { fontSize: 20, fontWeight: "800", color: "white" },
  chronoBox: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 10,
    alignItems: "center",
  },
  chronoText: { fontSize: 13, fontWeight: "700", color: "white" },
  instructionsBox: { marginBottom: 12, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.08)", padding: 10 },
  instructionsText: { fontSize: 12, color: "rgba(255,255,255,0.85)" },
  directionsBtn: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "white",
    paddingVertical: 12,
  },
  callBtn: { marginBottom: 16, backgroundColor: "#2ECC71" },
  directionsText: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  errorBox: { marginBottom: 12, borderRadius: 4, backgroundColor: "rgba(239,68,68,0.1)", padding: 12 },
  errorText: { fontSize: 13, color: "#FCA5A5" },
  stepsRow: { marginBottom: 16, flexDirection: "row", justifyContent: "space-between" },
  step: { flex: 1, alignItems: "center" },
  stepDot: { height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  stepLabel: { marginTop: 4, textAlign: "center", fontSize: 10 },
  actionBtn: { alignItems: "center", borderRadius: 8, backgroundColor: "#2ECC71", paddingVertical: 14 },
  actionText: { fontWeight: "700", color: "white" },
});

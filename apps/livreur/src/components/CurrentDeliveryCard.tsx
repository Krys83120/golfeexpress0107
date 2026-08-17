import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, Linking, Platform } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { OrderStatus } from "@golfeexpress/types";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";
import { getCategoryEmoji } from "@/services/categoryVisuals";
import { DocumentPhotoField } from "@/components/DocumentPhotoField";
import { uploadDeliveryProof } from "@/services/uploadsApi";

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

function callClient(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

/** "12 min restantes" / "en retard de 4 min" — recalculé périodiquement (voir useEffect ci-dessous). */
function formatCountdown(estimatedDelivery: string): { label: string; isLate: boolean } {
  const remainingMs = new Date(estimatedDelivery).getTime() - Date.now();
  const remainingMin = Math.round(remainingMs / 60_000);
  if (remainingMin >= 0) {
    return { label: `⏱️ ${remainingMin} min restantes`, isLate: false };
  }
  return { label: `⚠️ En retard de ${Math.abs(remainingMin)} min`, isLate: true };
}

export function CurrentDeliveryCard() {
  const activeDelivery = useRiderSessionStore((s) => s.activeDelivery);
  const advanceDeliveryStep = useRiderSessionStore((s) => s.advanceDeliveryStep);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bilan de livraison — demandé juste avant de confirmer "Commande
  // livrée", jamais pour les étapes précédentes (récupération, en route).
  const [showProofPanel, setShowProofPanel] = useState(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);
  const [proofCode, setProofCode] = useState("");

  // Recalcule l'affichage du compte à rebours toutes les 15s — un simple
  // compteur de rendu suffit, formatCountdown relit l'heure actuelle à
  // chaque appel.
  const [, forceTick] = useState(0);

  // Tant qu'une livraison est en cours, on empêche l'écran de s'éteindre —
  // essentiel pour garder le GPS et le compte à rebours visibles pendant
  // que le livreur roule (téléphone souvent posé sur un support, pas en main).
  useKeepAwake();

  useEffect(() => {
    if (!activeDelivery?.estimatedDelivery) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, [activeDelivery?.estimatedDelivery]);

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

  // Le client n'est appelable qu'une fois la commande récupérée — avant
  // ça, le trajet ne le concerne pas encore.
  const clientPhone = activeDelivery.client?.user?.phone ?? null;
  const canCallClient =
    (activeDelivery.status === OrderStatus.PICKED_UP || activeDelivery.status === OrderStatus.IN_DELIVERY) &&
    !!clientPhone;

  const countdown =
    (activeDelivery.status === OrderStatus.PICKED_UP || activeDelivery.status === OrderStatus.IN_DELIVERY) &&
    activeDelivery.estimatedDelivery
      ? formatCountdown(activeDelivery.estimatedDelivery)
      : null;

  const isFinalStep = activeDelivery.status === OrderStatus.IN_DELIVERY;

  async function handleAction() {
    // Dernière étape (marquer livré) : on demande d'abord une preuve de
    // remise (photo et/ou code) plutôt que de clôturer directement.
    if (isFinalStep && !showProofPanel) {
      setShowProofPanel(true);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await advanceDeliveryStep(
        isFinalStep
          ? { deliveryPhoto: proofPhotoUrl ?? undefined, deliveryCode: proofCode.trim() || undefined }
          : undefined
      );
      setShowProofPanel(false);
      setProofPhotoUrl(null);
      setProofCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadProof(localUri: string) {
    const url = await uploadDeliveryProof(activeDelivery!.id, localUri);
    setProofPhotoUrl(url);
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

      {countdown && (
        <View style={[styles.countdownBox, countdown.isLate && styles.countdownBoxLate]}>
          <Text style={[styles.countdownText, countdown.isLate && styles.countdownTextLate]}>{countdown.label}</Text>
        </View>
      )}

      {destinationAddress && (
        <Pressable onPress={handleDirections} style={styles.directionsBtn}>
          <Text style={{ fontSize: 16 }}>🧭</Text>
          <Text style={styles.directionsText}>
            {isHeadingToPickup ? "Itinéraire vers le commerçant" : "Itinéraire vers le client"}
          </Text>
        </Pressable>
      )}

      {canCallClient && clientPhone && (
        <Pressable onPress={() => callClient(clientPhone)} style={[styles.directionsBtn, styles.callBtn]}>
          <Text style={{ fontSize: 16 }}>📞</Text>
          <Text style={[styles.directionsText, { color: "white" }]}>Appeler le client</Text>
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
                {isCompleted && <Text style={{ fontSize: 14, color: "white", fontWeight: "700" }}>✓</Text>}
              </View>
              <Text style={[styles.stepLabel, { color: isCompleted || isActive ? "white" : "rgba(255,255,255,0.5)" }]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {showProofPanel && (
        <View style={styles.proofPanel}>
          <Text style={styles.proofTitle}>Preuve de remise (optionnel)</Text>
          <View style={styles.proofPhotoWrap}>
            <DocumentPhotoField label="Photo de la remise" onUpload={handleUploadProof} />
          </View>
          <Text style={styles.proofLabel}>Code de remise donné par le client</Text>
          <TextInput
            value={proofCode}
            onChangeText={setProofCode}
            placeholder="Ex: 4821"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.proofInput}
          />
        </View>
      )}

      <Pressable
        onPress={handleAction}
        disabled={submitting || isWaitingForFoodToBeReady}
        style={[styles.actionBtn, { opacity: submitting || isWaitingForFoodToBeReady ? 0.5 : 1 }]}
      >
        <Text style={styles.actionText}>
          {isWaitingForFoodToBeReady
            ? "⏳ En attente que ce soit prêt..."
            : showProofPanel
              ? "✅ Confirmer la livraison"
              : ACTION_LABELS[activeDelivery.status] ?? "Continuer"}
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
  countdownBox: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "rgba(46,204,113,0.15)",
    paddingVertical: 10,
    alignItems: "center",
  },
  countdownBoxLate: { backgroundColor: "rgba(239,68,68,0.15)" },
  countdownText: { fontSize: 13, fontWeight: "700", color: "#2ECC71" },
  countdownTextLate: { color: "#FCA5A5" },
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
  waitingBox: { marginBottom: 16, borderRadius: 8, backgroundColor: "rgba(255,107,53,0.15)", padding: 12 },
  waitingText: { fontSize: 13, fontWeight: "600", color: "#FF6B35" },
  errorBox: { marginBottom: 12, borderRadius: 4, backgroundColor: "rgba(239,68,68,0.1)", padding: 12 },
  errorText: { fontSize: 13, color: "#FCA5A5" },
  stepsRow: { marginBottom: 16, flexDirection: "row", justifyContent: "space-between" },
  step: { flex: 1, alignItems: "center" },
  stepDot: { height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  stepLabel: { marginTop: 4, textAlign: "center", fontSize: 10 },
  proofPanel: { marginBottom: 16, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)", padding: 12 },
  proofTitle: { marginBottom: 10, fontSize: 13, fontWeight: "700", color: "white" },
  proofPhotoWrap: { borderRadius: 8, backgroundColor: "white", padding: 10, marginBottom: 4 },
  proofLabel: { marginTop: 4, marginBottom: 6, fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  proofInput: {
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "white",
    fontSize: 14,
  },
  actionBtn: { alignItems: "center", borderRadius: 8, backgroundColor: "#2ECC71", paddingVertical: 14 },
  actionText: { fontWeight: "700", color: "white" },
});
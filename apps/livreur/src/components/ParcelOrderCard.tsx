import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ParcelSize, type ParcelOrder } from "@golfeexpress/types";
import { haversineDistanceKm } from "@/services/categoryVisuals";

interface ParcelOrderCardProps {
  parcelOrder: ParcelOrder;
  riderLat?: number;
  riderLng?: number;
  onAccept: () => void;
}

const SIZE_LABELS: Record<ParcelSize, string> = {
  [ParcelSize.S]: "S — petit colis",
  [ParcelSize.M]: "M — colis moyen",
};

/**
 * Équivalent OrderCard.tsx pour Colis Express -- finition du workflow
 * Livreur (23/09/2026). Volontairement plus simple : pas de badge
 * préparation (une demande CONFIRMED, non encore prise, est toujours
 * immédiatement prête -- voir parcel-orders/route.ts), pas de bouton
 * "refuser" (contrairement aux commandes classiques, refuser une demande
 * Colis Express ne réserve rien côté serveur -- elle reste juste visible
 * pour un autre livreur).
 */
export function ParcelOrderCard({ parcelOrder, riderLat, riderLng, onAccept }: ParcelOrderCardProps) {
  const pickupDistanceKm =
    riderLat !== undefined && riderLng !== undefined && parcelOrder.fromAddress
      ? haversineDistanceKm(riderLat, riderLng, parcelOrder.fromAddress.lat, parcelOrder.fromAddress.lng)
      : null;

  const totalDistanceKm =
    parcelOrder.fromAddress && parcelOrder.toAddress
      ? haversineDistanceKm(
          parcelOrder.fromAddress.lat,
          parcelOrder.fromAddress.lng,
          parcelOrder.toAddress.lat,
          parcelOrder.toAddress.lng
        )
      : null;

  return (
    <View
      style={[
        styles.card,
        { elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 22 }}>📦</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.proName}>{parcelOrder.pro?.businessName ?? "Colis Express"}</Text>
          <Text style={styles.subtle}>
            {parcelOrder.parcelNumber} — {SIZE_LABELS[parcelOrder.size]}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.earnings}>{Number(parcelOrder.riderEarnings).toFixed(2).replace(".", ",")}€</Text>
        </View>
      </View>

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ alignItems: "center" }}>
            <View style={styles.dotGreen} />
            <View style={[styles.line, { minHeight: 32 }]} />
            <View style={styles.dotOrange} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.addrTitle}>Récupérer ici</Text>
              <Text style={styles.subtle}>
                {parcelOrder.fromAddress?.street}, {parcelOrder.fromAddress?.city}
                {pickupDistanceKm !== null ? ` — ${pickupDistanceKm} km` : ""}
              </Text>
            </View>
            <View>
              <Text style={styles.addrTitle}>Livrer à {parcelOrder.recipientName}</Text>
              <Text style={styles.subtle}>
                {parcelOrder.toAddress?.street}, {parcelOrder.toAddress?.city}
              </Text>
            </View>
          </View>
        </View>

        {parcelOrder.instructions && (
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsText}>💬 {parcelOrder.instructions}</Text>
          </View>
        )}

        {totalDistanceKm !== null && (
          <View style={styles.metaRow}>
            <Text style={{ fontSize: 13 }}>🧭</Text>
            <Text style={styles.subtle}>{totalDistanceKm} km au total</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={onAccept} style={styles.acceptBtn}>
          <Text style={styles.acceptText}>✅ Accepter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, overflow: "hidden", borderRadius: 16, backgroundColor: "white" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: "#E3F2FD" },
  iconCircle: { height: 48, width: 48, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#2196F3" },
  proName: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  subtle: { fontSize: 12, color: "#6B7280" },
  earnings: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  dotGreen: { height: 10, width: 10, borderRadius: 999, backgroundColor: "#2ECC71" },
  line: { marginVertical: 4, width: 2, flex: 1, backgroundColor: "#E5E7EB" },
  dotOrange: { height: 10, width: 10, borderRadius: 999, backgroundColor: "#F97316" },
  addrTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  instructionsBox: { marginTop: 12, borderRadius: 8, backgroundColor: "#F9FAFB", padding: 10 },
  instructionsText: { fontSize: 12, color: "#4B5563" },
  metaRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 6, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 14 },
  actionsRow: { flexDirection: "row", gap: 12, padding: 16, paddingTop: 0 },
  acceptBtn: { flex: 1, alignItems: "center", borderRadius: 8, backgroundColor: "#2196F3", paddingVertical: 14 },
  acceptText: { fontWeight: "700", color: "white" },
});

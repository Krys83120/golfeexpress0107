import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { getCategoryEmoji, haversineDistanceKm } from "@/services/categoryVisuals";

interface OrderCardProps {
  order: Order;
  riderLat?: number;
  riderLng?: number;
  onAccept: () => void;
  onDecline: () => void;
}

function formatPrepBadge(order: Order): { label: string; color: string; bg: string } | null {
  if (order.status === OrderStatus.READY) {
    return { label: "✅ Prête maintenant", color: "#2ECC71", bg: "#E8F5E9" };
  }
  if (order.status === OrderStatus.PREPARING && order.preparingStartedAt && order.estimatedPrepMinutes) {
    const readyAtMs = new Date(order.preparingStartedAt).getTime() + order.estimatedPrepMinutes * 60_000;
    const remainingMin = Math.max(0, Math.round((readyAtMs - Date.now()) / 60_000));
    return {
      label: remainingMin > 0 ? `👨‍🍳 En préparation — prête dans ~${remainingMin} min` : "👨‍🍳 En préparation — bientôt prête",
      color: "#FF6B35",
      bg: "#FFF3E0",
    };
  }
  return null;
}

export function OrderCard({ order, riderLat, riderLng, onAccept, onDecline }: OrderCardProps) {
  const emoji = order.pro ? getCategoryEmoji(order.pro.category) : "🏪";
  const itemCount = order.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;
  const prepBadge = formatPrepBadge(order);

  const pickupDistanceKm =
    riderLat !== undefined && riderLng !== undefined && order.fromAddress
      ? haversineDistanceKm(riderLat, riderLng, order.fromAddress.lat, order.fromAddress.lng)
      : null;

  const totalDistanceKm =
    order.fromAddress && order.toAddress
      ? haversineDistanceKm(order.fromAddress.lat, order.fromAddress.lng, order.toAddress.lat, order.toAddress.lng)
      : null;

  return (
    <View
      style={[
        styles.card,
        { elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      ]}
    >
      <View style={[styles.headerRow, { backgroundColor: "#FFF3E0" }]}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.proName}>{order.pro?.businessName ?? "Commerçant"}</Text>
          <Text style={styles.subtle}>{order.fromAddress?.city}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.earnings}>{Number(order.riderEarnings).toFixed(2).replace(".", ",")}€</Text>
        </View>
      </View>

      {prepBadge && (
        <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 8, backgroundColor: prepBadge.bg, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: prepBadge.color }}>{prepBadge.label}</Text>
        </View>
      )}

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
                {order.fromAddress?.street}, {order.fromAddress?.city}
                {pickupDistanceKm !== null ? ` — ${pickupDistanceKm} km` : ""}
              </Text>
            </View>
            <View>
              <Text style={styles.addrTitle}>Livrer ici</Text>
              <Text style={styles.subtle}>
                {order.toAddress?.street}, {order.toAddress?.city}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          {totalDistanceKm !== null && <MetaItem icon="distance" label={`${totalDistanceKm} km`} />}
          <MetaItem icon="items" label={`${itemCount} articles`} />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable onPress={onAccept} style={styles.acceptBtn}>
          <Text style={styles.acceptText}>✅ Accepter</Text>
        </Pressable>
        <Pressable onPress={onDecline} style={styles.declineBtn}>
          <Text style={{ fontSize: 16, color: "#1A1A2E" }}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetaItem({ icon, label }: { icon: "distance" | "items"; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={{ fontSize: 13 }}>{icon === "distance" ? "🧭" : "📦"}</Text>
      <Text style={styles.subtle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16, overflow: "hidden", borderRadius: 16, backgroundColor: "white" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  iconCircle: { height: 48, width: 48, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#F97316" },
  proName: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  subtle: { fontSize: 12, color: "#6B7280" },
  earnings: { fontSize: 18, fontWeight: "800", color: "#1A1A2E" },
  dotGreen: { height: 10, width: 10, borderRadius: 999, backgroundColor: "#2ECC71" },
  line: { marginVertical: 4, width: 2, flex: 1, backgroundColor: "#E5E7EB" },
  dotOrange: { height: 10, width: 10, borderRadius: 999, backgroundColor: "#F97316" },
  addrTitle: { fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  metaRow: { marginTop: 14, flexDirection: "row", gap: 16, borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 14 },
  actionsRow: { flexDirection: "row", gap: 12, padding: 16, paddingTop: 0 },
  acceptBtn: { flex: 1, alignItems: "center", borderRadius: 8, backgroundColor: "#2ECC71", paddingVertical: 14 },
  acceptText: { fontWeight: "700", color: "white" },
  declineBtn: { height: 46, width: 46, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 2, borderColor: "#E5E7EB" },
});

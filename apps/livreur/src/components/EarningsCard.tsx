import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";

export function EarningsCard() {
  const todayEarnings = useRiderSessionStore((s) => s.todayEarnings);
  const todayDeliveries = useRiderSessionStore((s) => s.todayDeliveries);
  const todayRating = useRiderSessionStore((s) => s.todayRating);
  const onlineSinceMinutes = useRiderSessionStore((s) => s.onlineSinceMinutes);

  const hours = Math.floor(onlineSinceMinutes / 60);
  const minutes = onlineSinceMinutes % 60;

  return (
    <View style={[styles.card, { backgroundColor: "#1A1A2E" }]}>
      <View style={styles.withdrawWrap}>
        <Pressable style={styles.withdrawBtn}>
          <Text style={styles.withdrawText}>Retirer</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>💰 Gains aujourd'hui</Text>
      <Text style={styles.amount}>{todayEarnings.toFixed(2).replace(".", ",")} €</Text>

      <View style={styles.statsRow}>
        <EarningsStat value={String(todayDeliveries)} label="Livraisons" />
        <EarningsStat value={todayRating.toFixed(1)} label="Note moyenne" />
        <EarningsStat value={`${hours}h${minutes.toString().padStart(2, "0")}`} label="En ligne" />
      </View>
    </View>
  );
}

function EarningsStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: "relative", marginHorizontal: 20, marginTop: 16, borderRadius: 16, padding: 20 },
  withdrawWrap: { position: "absolute", right: 20, top: 20 },
  withdrawBtn: { borderRadius: 8, backgroundColor: "#2ECC71", paddingHorizontal: 16, paddingVertical: 8 },
  withdrawText: { fontSize: 13, fontWeight: "700", color: "white" },
  label: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  amount: { marginTop: 4, fontSize: 32, fontWeight: "800", color: "white" },
  statsRow: { marginTop: 16, flexDirection: "row" },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: "white" },
  statLabel: { marginTop: 2, fontSize: 11, color: "rgba(255,255,255,0.6)" },
});

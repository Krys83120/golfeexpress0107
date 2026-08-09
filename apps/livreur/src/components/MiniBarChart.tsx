import React from "react";
import { View, Text, StyleSheet } from "react-native";

export interface WeeklyDeliveryPoint {
  label: string;
  deliveries: number;
}

interface MiniBarChartProps {
  data: WeeklyDeliveryPoint[];
}

export function MiniBarChart({ data }: MiniBarChartProps) {
  const max = Math.max(...data.map((d) => d.deliveries), 1);

  return (
    <View style={[styles.row, { height: 120 }]}>
      {data.map((point) => {
        const heightRatio = point.deliveries / max;
        return (
          <View key={point.label} style={styles.col}>
            <Text style={styles.value}>{point.deliveries}</Text>
            <View style={[styles.bar, { height: Math.max(6, heightRatio * 80) }]} />
            <Text style={styles.label}>{point.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  col: { flex: 1, alignItems: "center" },
  value: { marginBottom: 4, fontSize: 11, fontWeight: "700", color: "#1A1A2E" },
  bar: { width: 20, borderRadius: 999, backgroundColor: "#2ECC71" },
  label: { marginTop: 6, fontSize: 11, color: "#6B7280" },
});

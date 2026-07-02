import React from "react";
import { View, Text } from "react-native";
import type { WeeklyDeliveryPoint } from "@/services/mockStats";

interface MiniBarChartProps {
  data: WeeklyDeliveryPoint[];
}

export function MiniBarChart({ data }: MiniBarChartProps) {
  const max = Math.max(...data.map((d) => d.deliveries), 1);

  return (
    <View className="flex-row items-end justify-between" style={{ height: 120 }}>
      {data.map((point) => {
        const heightRatio = point.deliveries / max;
        return (
          <View key={point.label} className="flex-1 items-center">
            <Text className="mb-1 text-[11px] font-bold text-nuit">{point.deliveries}</Text>
            <View
              className="w-5 rounded-full bg-golfe-green"
              style={{ height: Math.max(6, heightRatio * 80) }}
            />
            <Text className="mt-1.5 text-[11px] text-gris">{point.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

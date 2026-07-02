import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";

export function EarningsCard() {
  const todayEarnings = useRiderSessionStore((s) => s.todayEarnings);
  const todayDeliveries = useRiderSessionStore((s) => s.todayDeliveries);
  const todayRating = useRiderSessionStore((s) => s.todayRating);
  const onlineSinceMinutes = useRiderSessionStore((s) => s.onlineSinceMinutes);

  const hours = Math.floor(onlineSinceMinutes / 60);
  const minutes = onlineSinceMinutes % 60;

  return (
    <View
      className="relative mx-5 mt-4 rounded p-5"
      style={{ backgroundColor: "#1A1A2E" }}
    >
      <Pressable className="absolute right-5 top-5 rounded-sm bg-golfe-green px-4 py-2">
        <Text className="text-[13px] font-bold text-white">Retirer</Text>
      </Pressable>

      <Text className="text-[13px] text-white/70">💰 Gains aujourd'hui</Text>
      <Text className="mt-1 font-heading text-[32px] font-extrabold text-white">
        {todayEarnings.toFixed(2).replace(".", ",")} €
      </Text>

      <View className="mt-4 flex-row">
        <EarningsStat value={String(todayDeliveries)} label="Livraisons" />
        <EarningsStat value={todayRating.toFixed(1)} label="Note moyenne" />
        <EarningsStat value={`${hours}h${minutes.toString().padStart(2, "0")}`} label="En ligne" />
      </View>
    </View>
  );
}

function EarningsStat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-lg font-bold text-white">{value}</Text>
      <Text className="mt-0.5 text-[11px] text-white/60">{label}</Text>
    </View>
  );
}

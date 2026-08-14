import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import type { ProWithUi } from "@/services/prosApi";

interface NearbyItemProps {
  pro: ProWithUi;
  onPress: () => void;
}

export function NearbyItem({ pro, onPress }: NearbyItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row gap-3.5 rounded-sm bg-white p-3.5"
      style={{ elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }}
    >
      <View
        className="h-20 w-20 items-center justify-center overflow-hidden rounded-sm"
        style={{ backgroundColor: pro.gradientTo }}
      >
        {pro.logo ? (
          <Image source={{ uri: pro.logo }} style={{ width: 80, height: 80 }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 32 }}>{pro.emoji}</Text>
        )}
      </View>

      <View className="flex-1 justify-center">
        <Text className="font-heading text-[15px] font-bold text-nuit">{pro.businessName}</Text>
        <Text className="mb-1.5 text-xs text-gris">{pro.description}</Text>

        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Text style={{ fontSize: 10 }}>⭐</Text>
            <Text className="text-xs font-bold text-corail">{Number(pro.rating)?.toFixed(1)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text style={{ fontSize: 10 }}>🕒</Text>
            <Text className="text-xs text-gris">
              {pro.estimatedMinMinutes}-{pro.estimatedMaxMinutes} min
            </Text>
          </View>
          <View className="rounded-md bg-gris-light px-2 py-0.5">
            <Text className="text-[11px] text-gris">{pro.distanceKm} km</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

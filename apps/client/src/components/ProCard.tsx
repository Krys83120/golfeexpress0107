import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ProWithUi } from "@/services/prosApi";

interface ProCardProps {
  pro: ProWithUi;
  onPress: () => void;
}

export function ProCard({ pro, onPress }: ProCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mr-4 w-[260px] overflow-hidden rounded bg-white"
      style={{ elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
    >
      {/* Cover photo si disponible, sinon emoji de catégorie sur fond dégradé */}
      <View
        className="h-32 items-center justify-center"
        style={{ backgroundColor: pro.gradientTo }}
      >
        {pro.coverImage ? (
          <Image source={{ uri: pro.coverImage }} style={{ width: "100%", height: "100%", position: "absolute" }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 52 }}>{pro.emoji}</Text>
        )}

        <View
          className="absolute left-3 top-3 rounded-full px-2.5 py-1"
          style={{ backgroundColor: pro.isOpen ? "#2ECC71" : "#6B7280" }}
        >
          <Text className="text-[11px] font-bold text-white">{pro.isOpen ? "Ouvert" : "Fermé"}</Text>
        </View>

        <Pressable className="absolute right-3 top-3 h-8 w-8 items-center justify-center rounded-full bg-white/90">
          <Ionicons name="heart-outline" size={16} color="#1A1A2E" />
        </Pressable>
      </View>

      {/* Info */}
      <View className="p-4">
        <Text className="font-heading text-base font-bold text-nuit">{pro.businessName}</Text>

        <View className="mt-1 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5">
            <Ionicons name="star" size={11} color="#FF6B35" />
            <Text className="text-xs font-bold text-corail">{pro.rating?.toFixed(1)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={12} color="#6B7280" />
            <Text className="text-xs text-gris">
              {pro.estimatedMinMinutes}-{pro.estimatedMaxMinutes} min
            </Text>
          </View>
        </View>

        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {pro.tags.map((tag) => (
            <View key={tag} className="rounded-md bg-gris-light px-2 py-1">
              <Text className="text-[11px] text-gris">{tag}</Text>
            </View>
          ))}
        </View>

        <View className="mt-3 flex-row items-center justify-between border-t border-gris-light pt-3">
          <Text className="text-[13px] text-gris">
            Livraison <Text className="font-bold text-golfe-green">{pro.deliveryFeeDisplay.toFixed(2)}€</Text>
          </Text>
          <Text className="text-xs text-gris">Min. {pro.minOrder}€</Text>
        </View>
      </View>
    </Pressable>
  );
}

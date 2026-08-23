import React from "react";
import { View, Text, Pressable, Image } from "react-native";
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

        {/* "En vacances" distingué visuellement d'un simple "Fermé" (hors
            horaires ou fermeture ponctuelle) — le client sait s'il doit
            revenir plus tard dans la journée ou si le commerçant est
            indisponible pour un moment plus long. */}
        <View
          className="absolute left-3 top-3 rounded-full px-2.5 py-1"
          style={{ backgroundColor: pro.isOpen ? "#2ECC71" : pro.openReason === "VACATION" ? "#FF6B35" : "#6B7280" }}
        >
          <Text className="text-[11px] font-bold text-white">
            {pro.isOpen ? "Ouvert" : pro.openReason === "VACATION" ? "🏖️ En vacances" : "Fermé"}
          </Text>
        </View>

        <View className="absolute right-3 top-3">
          <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-white/90">
            <Text style={{ fontSize: 14 }}>🤍</Text>
          </Pressable>
        </View>
      </View>

      {/* Info */}
      <View className="p-4">
        <Text className="font-heading text-base font-bold text-nuit">{pro.businessName}</Text>

        <View className="mt-1 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5">
            <Text style={{ fontSize: 10 }}>⭐</Text>
            <Text className="text-xs font-bold text-corail">{Number(pro.rating)?.toFixed(1)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Text style={{ fontSize: 11 }}>🕒</Text>
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
            {/* "à partir de" seulement quand la distance est une estimation
                (pas encore d'adresse de livraison connue) — dès qu'on
                connaît la vraie adresse active, ce montant EST le tarif
                réel pour cette adresse, plus la peine de le présenter comme
                un plancher (22/08/2026). */}
            {pro.deliveryFeeIsEstimate ? "Livraison à partir de" : "Livraison"}{" "}
            <Text className="font-bold text-golfe-green">{pro.deliveryFeeDisplay.toFixed(2)}€</Text>
          </Text>
          <Text className="text-xs text-gris">Min. {pro.minOrder}€</Text>
        </View>
      </View>
    </Pressable>
  );
}

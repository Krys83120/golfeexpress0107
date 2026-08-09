import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ProWithUi } from "@/services/prosApi";
import { useProsStore } from "@/store/useProsStore";

interface MapScreenProps {
  onClose: () => void;
  onOpenPro: (pro: ProWithUi) => void;
}

/**
 * Carte interactive — placeholder visuel avec pins positionnés de façon
 * illustrative (pas encore les vraies coordonnées projetées sur une carte).
 * À remplacer par une vraie carte (Mapbox GL / react-native-maps) utilisant
 * Pro.addresses[0].lat/lng une fois ce composant cartographique choisi.
 */
export function MapScreen({ onClose, onOpenPro }: MapScreenProps) {
  const pros = useProsStore((s) => s.pros);
  const [selectedPro, setSelectedPro] = useState<ProWithUi | null>(null);

  function handlePinPress(pro: ProWithUi) {
    setSelectedPro(pro);
  }

  return (
    <View className="flex-1 bg-white">
      <View className="relative flex-1" style={{ backgroundColor: "#E8F5E9" }}>
        {pros.map((pro, index) => {
          // Distribution illustrative des pins sur la zone (placeholder visuel)
          const left = 10 + ((index * 17) % 75);
          const top = 15 + ((index * 23) % 60);
          const isSelected = selectedPro?.id === pro.id;
          return (
            <Pressable
              key={pro.id}
              onPress={() => handlePinPress(pro)}
              className="absolute items-center"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <View
                className="h-11 w-11 items-center justify-center rounded-full border-2 border-white"
                style={{
                  backgroundColor: pro.gradientTo,
                  transform: [{ scale: isSelected ? 1.2 : 1 }],
                  elevation: 4,
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                }}
              >
                <Text style={{ fontSize: 18 }}>{pro.emoji}</Text>
              </View>
            </Pressable>
          );
        })}

        <SafeAreaView edges={["top"]} className="absolute left-0 right-0 top-0">
          <View className="flex-row items-center justify-between px-5 pt-2">
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow">
              <Ionicons name="arrow-back" size={18} color="#1A1A2E" />
            </Pressable>
            <View className="rounded-full bg-white px-4 py-2 shadow">
              <Text className="text-sm font-semibold text-nuit">{pros.length} commerçants</Text>
            </View>
            <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white shadow">
              <Ionicons name="locate" size={18} color="#2ECC71" />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>

      {/* Bottom sheet : liste ou détail du pin sélectionné */}
      <View className="border-t border-gris-light bg-white px-5 pb-6 pt-4" style={{ maxHeight: 260 }}>
        {selectedPro ? (
          <Pressable
            onPress={() => onOpenPro(selectedPro)}
            className="flex-row items-center gap-3 rounded-sm bg-gris-light p-3.5"
          >
            <View
              className="h-14 w-14 items-center justify-center rounded-sm"
              style={{ backgroundColor: selectedPro.gradientTo }}
            >
              <Text style={{ fontSize: 26 }}>{selectedPro.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-heading text-[15px] font-bold text-nuit">{selectedPro.businessName}</Text>
              <View className="mt-1 flex-row items-center gap-3">
                <Text className="text-xs text-gris">⭐ {Number(selectedPro.rating)?.toFixed(1) ?? "—"}</Text>
                <Text className="text-xs text-gris">
                  {selectedPro.estimatedMinMinutes}-{selectedPro.estimatedMaxMinutes} min
                </Text>
                <Text className="text-xs text-gris">{selectedPro.distanceKm} km</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </Pressable>
        ) : (
          <>
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-gris">
              Commerçants visibles sur la carte
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {pros.map((pro) => (
                <Pressable
                  key={pro.id}
                  onPress={() => handlePinPress(pro)}
                  className="w-[100px] items-center rounded-sm bg-gris-light p-3"
                >
                  <View
                    className="mb-1.5 h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: pro.gradientTo }}
                  >
                    <Text style={{ fontSize: 16 }}>{pro.emoji}</Text>
                  </View>
                  <Text className="text-center text-[11px] font-semibold text-nuit" numberOfLines={1}>
                    {pro.businessName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

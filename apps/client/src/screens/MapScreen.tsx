import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ProWithUi } from "@/services/prosApi";
import { useProsStore } from "@/store/useProsStore";
import { ClientMapView, type MapPinData } from "@/components/ClientMapView";

interface MapScreenProps {
  onClose: () => void;
  onOpenPro: (pro: ProWithUi) => void;
}

export function MapScreen({ onClose, onOpenPro }: MapScreenProps) {
  const pros = useProsStore((s) => s.pros);
  const [selectedPro, setSelectedPro] = useState<ProWithUi | null>(null);

  const prosWithLocation = pros.filter((p) => p.addresses?.[0]);

  const pins: MapPinData[] = prosWithLocation.map((pro) => ({
    id: pro.id,
    lat: pro.addresses![0].lat,
    lng: pro.addresses![0].lng,
    emoji: pro.emoji,
    color: pro.gradientTo,
    label: pro.businessName,
  }));

  function handlePinPress(proId: string) {
    const pro = prosWithLocation.find((p) => p.id === proId);
    if (pro) setSelectedPro(pro);
  }

  return (
    <View className="flex-1 bg-white">
      <View className="relative flex-1">
        {pins.length > 0 ? (
          <ClientMapView pins={pins} onPinPress={handlePinPress} />
        ) : (
          <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#E8F5E9" }}>
            <Text className="text-sm text-gris">Aucun commerçant géolocalisé pour le moment.</Text>
          </View>
        )}

        <SafeAreaView edges={["top"]} className="absolute left-0 right-0 top-0" pointerEvents="box-none">
          <View className="flex-row items-center justify-between px-5 pt-2">
            <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow">
              <Ionicons name="arrow-back" size={18} color="#1A1A2E" />
            </Pressable>
            <View className="rounded-full bg-white px-4 py-2 shadow">
              <Text className="text-sm font-semibold text-nuit">{prosWithLocation.length} commerçants</Text>
            </View>
            <View className="h-10 w-10" />
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
              {prosWithLocation.map((pro) => (
                <Pressable
                  key={pro.id}
                  onPress={() => setSelectedPro(pro)}
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

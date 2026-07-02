import React, { useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ProWithUi } from "@/services/prosApi";
import { useProsStore } from "@/store/useProsStore";
import { useCartStore } from "@/store/useCartStore";
import type { Product } from "@golfeexpress/types";

interface ProDetailScreenProps {
  pro: ProWithUi;
  onClose: () => void;
}

export function ProDetailScreen({ pro, onClose }: ProDetailScreenProps) {
  const addItem = useCartStore((s) => s.addItem);
  const productsByPro = useProsStore((s) => s.productsByPro);
  const productsStatus = useProsStore((s) => s.productsStatus[pro.id]);
  const loadProductsForPro = useProsStore((s) => s.loadProductsForPro);

  useEffect(() => {
    loadProductsForPro(pro.id);
  }, [pro.id]);

  const products = productsByPro[pro.id] ?? [];

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    acc[p.category] = acc[p.category] ?? [];
    acc[p.category].push(p);
    return acc;
  }, {});

  function handleAdd(product: Product) {
    addItem(
      {
        id: product.id,
        productId: product.id,
        name: product.name,
        emoji: product.image ?? "🍽️",
        unitPrice: product.price,
      },
      pro.id,
      pro.businessName,
      pro.pickupAddressId
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="mx-5 mt-5 h-48 items-center justify-center overflow-hidden rounded" style={{ backgroundColor: pro.gradientTo }}>
          {pro.coverImage ? (
            <Image source={{ uri: pro.coverImage }} style={{ width: "100%", height: "100%", position: "absolute" }} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 64 }}>{pro.emoji}</Text>
          )}
          <Pressable
            onPress={onClose}
            className="absolute left-4 top-4 h-10 w-10 items-center justify-center rounded-full bg-white/90"
          >
            <Ionicons name="close" size={18} color="#1A1A2E" />
          </Pressable>
        </View>

        <View className="mx-5 mt-4">
          <Text className="font-heading text-xl font-bold text-nuit">{pro.businessName}</Text>
          <View className="mt-1 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5">
              <Ionicons name="star" size={11} color="#FF6B35" />
              <Text className="text-xs font-bold text-corail">{pro.rating?.toFixed(1) ?? "—"}</Text>
            </View>
            <Text className="text-[13px] text-gris">
              <Ionicons name="time-outline" size={12} /> {pro.estimatedMinMinutes}-{pro.estimatedMaxMinutes} min
            </Text>
          </View>
        </View>

        {productsStatus === "loading" && (
          <View className="items-center py-12">
            <ActivityIndicator color="#2ECC71" />
            <Text className="mt-2 text-sm text-gris">Chargement du menu...</Text>
          </View>
        )}

        {productsStatus === "error" && (
          <View className="mx-5 mt-6 rounded-sm bg-red-50 p-4">
            <Text className="text-sm text-red-500">Impossible de charger le menu.</Text>
            <Pressable onPress={() => loadProductsForPro(pro.id)} className="mt-2">
              <Text className="text-sm font-semibold text-golfe-green">Réessayer</Text>
            </Pressable>
          </View>
        )}

        {productsStatus === "loaded" && products.length === 0 && (
          <View className="items-center py-12">
            <Text style={{ fontSize: 36 }}>🍽️</Text>
            <Text className="mt-2 text-sm text-gris">Aucun produit disponible pour le moment.</Text>
          </View>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <View key={category} className="mx-5 mt-6">
            <Text className="mb-3 font-heading text-base font-bold text-nuit">
              {category === "Boissons" ? "🥤" : "🥗"} {category}
            </Text>
            {items.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => handleAdd(product)}
                className="mb-2.5 flex-row gap-3.5 rounded-sm bg-gris-light p-3.5"
              >
                <View
                  className="h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-sm"
                  style={{ backgroundColor: "#2ECC71" }}
                >
                  {product.image?.startsWith("http") ? (
                    <Image source={{ uri: product.image }} style={{ width: 70, height: 70 }} />
                  ) : (
                    <Text style={{ fontSize: 28 }}>{product.image ?? "🍽️"}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-nuit">{product.name}</Text>
                  <Text className="mb-1.5 mt-1 text-xs leading-4 text-gris">{product.description}</Text>
                  <Text className="text-[15px] font-bold text-golfe-green">
                    {product.price.toFixed(2).replace(".", ",")} €
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleAdd(product)}
                  className="h-8 w-8 self-center items-center justify-center rounded-full bg-golfe-green"
                >
                  <Ionicons name="add" size={18} color="white" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

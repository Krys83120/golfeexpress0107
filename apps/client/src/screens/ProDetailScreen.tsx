import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ProWithUi } from "@/services/prosApi";
import { useProsStore } from "@/store/useProsStore";
import { useCartStore } from "@/store/useCartStore";
import { ProductOptionsModal } from "@/components/ProductOptionsModal";
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
  const [optionsModalProduct, setOptionsModalProduct] = useState<Product | null>(null);

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
        unitPrice: Number(product.price),
      },
      pro.id,
      pro.businessName,
      pro.pickupAddressId
    );
  }

  function handlePressProduct(product: Product) {
    // Produit avec des options (taille, base, sauce...) -> on ouvre l'écran
    // de sélection avant d'ajouter au panier. Sinon, ajout direct comme avant.
    if (product.options && product.options.length > 0) {
      setOptionsModalProduct(product);
    } else {
      handleAdd(product);
    }
  }

  function handleConfirmOptions(selection: { options: Record<string, string>; optionsLabel: string; extraPrice: number }) {
    const product = optionsModalProduct;
    if (!product) return;

    // Un id de ligne de panier différent par combinaison d'options choisie
    // (deux "Poke Saumon" avec des tailles différentes doivent rester deux
    // lignes distinctes), en combinant l'id produit avec les options triées.
    const optionsKey = Object.entries(selection.options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join("|");
    const lineId = optionsKey ? `${product.id}__${optionsKey}` : product.id;

    addItem(
      {
        id: lineId,
        productId: product.id,
        name: product.name,
        emoji: product.image ?? "🍽️",
        unitPrice: Number(product.price) + selection.extraPrice,
        optionsLabel: selection.optionsLabel || undefined,
        options: Object.keys(selection.options).length > 0 ? selection.options : undefined,
      },
      pro.id,
      pro.businessName,
      pro.pickupAddressId
    );
    setOptionsModalProduct(null);
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
          <View className="absolute left-4 top-4">
            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-white/90"
            >
              <Ionicons name="close" size={18} color="#1A1A2E" />
            </Pressable>
          </View>
        </View>

        <View className="mx-5 mt-4">
          <Text className="font-heading text-xl font-bold text-nuit">{pro.businessName}</Text>
          <View className="mt-1 flex-row items-center gap-3">
            <View className="flex-row items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5">
              <Ionicons name="star" size={11} color="#FF6B35" />
              <Text className="text-xs font-bold text-corail">{Number(pro.rating)?.toFixed(1) ?? "—"}</Text>
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
                onPress={() => handlePressProduct(product)}
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
                    {Number(product.price).toFixed(2).replace(".", ",")} €
                    {product.options && product.options.length > 0 && (
                      <Text className="text-xs font-normal text-gris"> • options</Text>
                    )}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handlePressProduct(product)}
                  className="h-8 w-8 self-center items-center justify-center rounded-full bg-golfe-green"
                >
                  <Ionicons name="add" size={18} color="white" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      {optionsModalProduct && (
        <ProductOptionsModal
          product={optionsModalProduct}
          onClose={() => setOptionsModalProduct(null)}
          onConfirm={handleConfirmOptions}
        />
      )}
    </SafeAreaView>
  );
}

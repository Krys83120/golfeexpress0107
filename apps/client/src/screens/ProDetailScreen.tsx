import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { ProWithUi } from "@/services/prosApi";
import { useProsStore } from "@/store/useProsStore";
import { useCartStore } from "@/store/useCartStore";
import { ProductOptionsModal } from "@/components/ProductOptionsModal";
import type { Product } from "@golfeexpress/types";

// Même ordre que côté Pro (SettingsPage.tsx) : dayOfWeek 0 = Dimanche.
const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface ProDetailScreenProps {
  pro: ProWithUi;
  onClose: () => void;
  /** Ouvre automatiquement la fiche de ce produit dès que la liste des
   * produits est chargée — utilisé pour le deep-link depuis le site
   * vitrine (clic sur un produit → arrive directement dessus dans l'app,
   * au lieu de l'écran d'accueil générique). */
  initialProductId?: string;
}

export function ProDetailScreen({ pro, onClose, initialProductId }: ProDetailScreenProps) {
  const addItem = useCartStore((s) => s.addItem);
  const productsByPro = useProsStore((s) => s.productsByPro);
  const productsStatus = useProsStore((s) => s.productsStatus[pro.id]);
  const loadProductsForPro = useProsStore((s) => s.loadProductsForPro);
  const [optionsModalProduct, setOptionsModalProduct] = useState<Product | null>(null);
  const [deepLinkConsumed, setDeepLinkConsumed] = useState(false);

  useEffect(() => {
    loadProductsForPro(pro.id);
  }, [pro.id]);

  const products = productsByPro[pro.id] ?? [];

  // Une fois les produits chargés, ouvre automatiquement la fiche du
  // produit visé par le lien — une seule fois (deepLinkConsumed évite de
  // rouvrir la modal si l'utilisateur la ferme puis que ce composant se
  // re-rend pour une autre raison).
  useEffect(() => {
    if (!initialProductId || deepLinkConsumed || productsStatus !== "loaded") return;
    const match = products.find((p) => p.id === initialProductId);
    if (match) setOptionsModalProduct(match);
    setDeepLinkConsumed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProductId, productsStatus, deepLinkConsumed]);

  const grouped = products.reduce<Record<string, Product[]>>((acc, p) => {
    acc[p.category] = acc[p.category] ?? [];
    acc[p.category].push(p);
    return acc;
  }, {});

  // Infos du commerce (adresse, horaires, temps de préparation, site web /
  // réseaux sociaux) — affichées sous la bannière, en dessous du nom/de la
  // note. Toutes optionnelles : un commerçant n'ayant pas encore renseigné
  // certains champs (voir Réglages côté Pro) n'affiche simplement pas la
  // ligne correspondante plutôt qu'un espace vide ou "—".
  const proAddress = pro.addresses?.[0];
  const formattedAddress = proAddress
    ? [proAddress.street, proAddress.complement, `${proAddress.zipCode} ${proAddress.city}`.trim()]
        .filter(Boolean)
        .join(", ")
    : null;
  const sortedHours = [...(pro.openingHours ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const hasSocialLinks = Boolean(pro.websiteUrl || pro.instagramUrl || pro.facebookUrl || pro.tiktokUrl);
  const hasBusinessInfo = Boolean(
    formattedAddress || pro.phone || pro.emailContact || pro.defaultPrepTimeMinutes || sortedHours.length > 0 || hasSocialLinks
  );

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
    // Commerçant fermé (horaires, ou "En vacances"/"Fermé" côté Pro) : on
    // bloque l'ajout au panier ici plutôt que de laisser l'utilisateur
    // découvrir l'erreur seulement au moment de payer — le serveur refuse
    // de toute façon la commande dans ce cas (voir orders/route.ts).
    if (!pro.isOpen) {
      Alert.alert(
        pro.openReason === "VACATION" ? "Commerçant en vacances" : "Commerçant fermé",
        "Ce commerçant n'accepte pas de commande pour le moment."
      );
      return;
    }

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
              <Text style={{ fontSize: 16, color: "#1A1A2E" }}>✕</Text>
            </Pressable>
          </View>
        </View>

        <View className="mx-5 mt-4">
          <Text className="font-heading text-xl font-bold text-nuit">{pro.businessName}</Text>
          <View className="mt-1 flex-row flex-wrap items-center gap-3">
            <View className="flex-row items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5">
              <Text style={{ fontSize: 10 }}>⭐</Text>
              <Text className="text-xs font-bold text-corail">{Number(pro.rating)?.toFixed(1) ?? "—"}</Text>
            </View>
            {pro.googleRating !== null && pro.googleRating !== undefined && (
              <View className="flex-row items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5">
                <Text style={{ fontSize: 11 }}>🇬</Text>
                <Text className="text-xs font-bold text-blue-600">{Number(pro.googleRating).toFixed(1)}</Text>
                <Text className="text-[11px] text-gris">({pro.googleRatingCount})</Text>
              </View>
            )}
            <Text className="text-[13px] text-gris">
              <Text style={{ fontSize: 11 }}>🕒</Text> {pro.estimatedMinMinutes}-{pro.estimatedMaxMinutes} min
            </Text>
          </View>

          {hasSocialLinks && (
            <View className="mt-2 flex-row items-center gap-3.5">
              {pro.instagramUrl && (
                <Pressable onPress={() => Linking.openURL(pro.instagramUrl!)}>
                  <Ionicons name="logo-instagram" size={22} color="#C13584" />
                </Pressable>
              )}
              {pro.facebookUrl && (
                <Pressable onPress={() => Linking.openURL(pro.facebookUrl!)}>
                  <Ionicons name="logo-facebook" size={22} color="#1877F2" />
                </Pressable>
              )}
              {pro.tiktokUrl && (
                <Pressable onPress={() => Linking.openURL(pro.tiktokUrl!)}>
                  <Ionicons name="logo-tiktok" size={20} color="#1A1A2E" />
                </Pressable>
              )}
              {pro.websiteUrl && (
                <Pressable onPress={() => Linking.openURL(pro.websiteUrl!)}>
                  <Ionicons name="globe-outline" size={22} color="#2ECC71" />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {hasBusinessInfo && (
          <View className="mx-5 mt-4 rounded-sm bg-gris-light p-4">
            <Text className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-gris">Infos du commerce</Text>

            {formattedAddress && (
              <View className="mb-2 flex-row items-start gap-2">
                <Ionicons name="location-outline" size={15} color="#6B7280" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-[13px] text-nuit">{formattedAddress}</Text>
              </View>
            )}

            {pro.phone && (
              <View className="mb-2 flex-row items-center gap-2">
                <Ionicons name="call-outline" size={15} color="#6B7280" />
                <Pressable onPress={() => Linking.openURL(`tel:${pro.phone}`)}>
                  <Text className="text-[13px] text-nuit">{pro.phone}</Text>
                </Pressable>
              </View>
            )}

            {pro.emailContact && (
              <View className="mb-2 flex-row items-center gap-2">
                <Ionicons name="mail-outline" size={15} color="#6B7280" />
                <Pressable onPress={() => Linking.openURL(`mailto:${pro.emailContact}`)}>
                  <Text className="text-[13px] text-nuit">{pro.emailContact}</Text>
                </Pressable>
              </View>
            )}

            {pro.defaultPrepTimeMinutes ? (
              <View className="mb-2 flex-row items-center gap-2">
                <Ionicons name="timer-outline" size={15} color="#6B7280" />
                <Text className="flex-1 text-[13px] text-nuit">
                  Temps de préparation habituel : ~{pro.defaultPrepTimeMinutes} min
                </Text>
              </View>
            ) : null}

            {sortedHours.length > 0 && (
              <View className="mb-2 flex-row items-start gap-2">
                <Ionicons name="time-outline" size={15} color="#6B7280" style={{ marginTop: 1 }} />
                <View className="flex-1">
                  {sortedHours.map((h) => (
                    <Text key={h.dayOfWeek} className="text-[12px] leading-5 text-gris">
                      {DAY_LABELS[h.dayOfWeek]} : {h.isClosed ? "Fermé" : `${h.openTime} - ${h.closeTime}`}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {hasSocialLinks && (
              <View className="flex-row items-center gap-3.5 pt-1">
                {pro.websiteUrl && (
                  <Pressable onPress={() => Linking.openURL(pro.websiteUrl!)}>
                    <Ionicons name="globe-outline" size={20} color="#2ECC71" />
                  </Pressable>
                )}
                {pro.instagramUrl && (
                  <Pressable onPress={() => Linking.openURL(pro.instagramUrl!)}>
                    <Ionicons name="logo-instagram" size={20} color="#C13584" />
                  </Pressable>
                )}
                {pro.facebookUrl && (
                  <Pressable onPress={() => Linking.openURL(pro.facebookUrl!)}>
                    <Ionicons name="logo-facebook" size={20} color="#1877F2" />
                  </Pressable>
                )}
                {pro.tiktokUrl && (
                  <Pressable onPress={() => Linking.openURL(pro.tiktokUrl!)}>
                    <Ionicons name="logo-tiktok" size={18} color="#1A1A2E" />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {!pro.isOpen && (
          <View
            className="mx-5 mt-4 rounded-sm p-3.5"
            style={{ backgroundColor: pro.openReason === "VACATION" ? "#FFF3E0" : "#F3F4F6" }}
          >
            <Text className="text-sm font-bold" style={{ color: pro.openReason === "VACATION" ? "#FF6B35" : "#374151" }}>
              {pro.openReason === "VACATION" ? "🏖️ Ce commerçant est en vacances" : "🚫 Ce commerçant est fermé actuellement"}
            </Text>
            {pro.closedUntil && (
              <Text className="mt-1 text-xs text-gris">
                Retour prévu le {new Date(pro.closedUntil).toLocaleDateString("fr-FR")}
              </Text>
            )}
            {pro.closedNote && <Text className="mt-1 text-xs text-gris">"{pro.closedNote}"</Text>}
            <Text className="mt-1 text-xs text-gris">Vous pouvez consulter le menu, mais pas commander pour le moment.</Text>
          </View>
        )}

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
                  <Text style={{ fontSize: 16, color: "white", fontWeight: "700" }}>+</Text>
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

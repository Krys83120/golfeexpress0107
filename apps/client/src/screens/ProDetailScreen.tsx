import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ProWithUi } from "@/services/prosApi";
import { useProsStore } from "@/store/useProsStore";
import { useCartStore } from "@/store/useCartStore";
import { ProductOptionsModal } from "@/components/ProductOptionsModal";
import { BusinessInfoCard } from "@/components/BusinessInfoCard";
import { FloatingCart } from "@/components/FloatingCart";
import type { Product } from "@golfeexpress/types";

interface ProDetailScreenProps {
  pro: ProWithUi;
  onClose: () => void;
  /**
   * Ouvre la modal panier par-dessus cette fiche (22/08/2026) — jusqu'ici,
   * seul l'écran d'accueil affichait un bouton panier flottant
   * (FloatingCart), obligeant à fermer la fiche commerçant pour consulter
   * un panier qu'on venait pourtant de remplir depuis cette même fiche.
   */
  onOpenCart: () => void;
  /** Ouvre automatiquement la fiche de ce produit dès que la liste des
   * produits est chargée — utilisé pour le deep-link depuis le site
   * vitrine (clic sur un produit → arrive directement dessus dans l'app,
   * au lieu de l'écran d'accueil générique). */
  initialProductId?: string;
}

export function ProDetailScreen({ pro, onClose, onOpenCart, initialProductId }: ProDetailScreenProps) {
  const addItem = useCartStore((s) => s.addItem);
  const productsByPro = useProsStore((s) => s.productsByPro);
  const productsStatus = useProsStore((s) => s.productsStatus[pro.id]);
  const loadProductsForPro = useProsStore((s) => s.loadProductsForPro);
  const categoriesByPro = useProsStore((s) => s.categoriesByPro);
  const reviewsByPro = useProsStore((s) => s.reviewsByPro);
  const reviewsStatus = useProsStore((s) => s.reviewsStatus[pro.id]);
  const loadReviewsForPro = useProsStore((s) => s.loadReviewsForPro);
  const [optionsModalProduct, setOptionsModalProduct] = useState<Product | null>(null);
  const [deepLinkConsumed, setDeepLinkConsumed] = useState(false);

  useEffect(() => {
    loadProductsForPro(pro.id);
    loadReviewsForPro(pro.id);
  }, [pro.id]);

  const products = productsByPro[pro.id] ?? [];
  const reviews = reviewsByPro[pro.id] ?? [];

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

  // Catégories dans l'ordre réglé depuis l'admin (voir MenuCategory /
  // AdminCategoryManagerModal.tsx, glisser-déposer) -- une catégorie jamais
  // personnalisée arrive après celles réordonnées, triée alphabétiquement
  // (voir ce tri déjà fait côté serveur dans GET /api/pros/[proId]/products,
  // categoriesMeta reprend cet ordre tel quel). On filtre sur `grouped` par
  // sécurité (categoriesMeta ne devrait jamais contenir de nom absent des
  // produits chargés, mais éviter une vignette vide si jamais).
  const categoriesMeta = categoriesByPro[pro.id] ?? [];
  const categories = useMemo(() => {
    const known = categoriesMeta.map((c) => c.name).filter((name) => grouped[name]);
    const extra = Object.keys(grouped).filter((name) => !known.includes(name));
    return [...known, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, categoriesMeta]);

  // Vignettes catégories/produits (23/09/2026, sur demande explicite --
  // remplace la liste verticale "toutes les catégories empilées avec tous
  // leurs produits en dessous", trop longue à faire défiler sur mobile) :
  // une rangée de vignettes-catégories en haut, puis une rangée de
  // vignettes-produits filtrée sur la catégorie sélectionnée. Le tap sur
  // une vignette-produit ouvre toujours la même fiche de composition
  // (ProductOptionsModal) qu'avant.
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    // Présélectionne la première catégorie dès qu'on en connaît la liste,
    // pour ne jamais laisser l'écran vide avant le premier tap -- ne touche
    // pas à la sélection si elle a déjà été faite (par le client, ou par ce
    // même effet à un rendu précédent).
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  // Photo de la vignette catégorie : priorité à la photo choisie
  // manuellement depuis l'admin (MenuCategory.image, "ajouter ou pas une
  // photo de catégorie" -- optionnel). Sans ça, on reprend la première
  // photo produit disponible dans cette catégorie ; sans ça non plus, un
  // emoji de repli (voir categoryTileEmoji ci-dessous).
  function categoryTilePhoto(category: string, items: Product[]): string | undefined {
    const custom = categoriesMeta.find((c) => c.name === category)?.image;
    if (custom) return custom;
    return items.find((p) => p.image?.startsWith("http"))?.image ?? undefined;
  }
  function categoryTileEmoji(category: string): string {
    const c = category.toLowerCase();
    if (c.includes("boisson")) return "🥤";
    if (c.includes("dessert")) return "🍰";
    if (c.includes("kids") || c.includes("enfant")) return "🧒";
    return "🍽️";
  }

  function handleAdd(product: Product) {
    // Commerçant fermé (horaires, ou "En vacances"/"Fermé" côté Pro) : on
    // bloque l'ajout au panier ici plutôt que de laisser l'utilisateur
    // découvrir l'erreur seulement au moment de payer — le serveur refuse
    // de toute façon la commande dans ce cas (voir orders/route.ts). La
    // consultation du produit (description, photos, options, avis) reste
    // possible même fermé : voir handleOpenProductDetail ci-dessous.
    if (!pro.isOpen) {
      Alert.alert(
        pro.openReason === "VACATION" ? "Commerçant en vacances" : "Commerçant fermé",
        "Ce commerçant n'accepte pas de commande pour le moment."
      );
      return;
    }

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
      pro.pickupAddressId,
      pro.pickupLat,
      pro.pickupLng
    );
  }

  // Ouvre systématiquement la fiche détaillée du produit (photos,
  // description, note moyenne, avis clients) -- y compris pour un produit
  // sans options, qui ne l'ouvrait pas avant (ajout direct au panier sans
  // jamais montrer sa note ni ses avis). Toujours autorisé même commerçant
  // fermé : consulter une fiche n'est pas une commande.
  function handleOpenProductDetail(product: Product) {
    setOptionsModalProduct(product);
  }

  // Chemin rapide (bouton "+") : ajoute directement au panier si le produit
  // n'a pas d'options à choisir, sinon ouvre la fiche (obligatoire pour
  // choisir les options avant d'ajouter).
  function handleQuickAdd(product: Product) {
    if (product.options && product.options.length > 0) {
      setOptionsModalProduct(product);
    } else {
      handleAdd(product);
    }
  }

  function handleConfirmOptions(selection: {
    options: Record<string, string>;
    optionsLabel: string;
    extraPrice: number;
    specialInstructions?: string;
  }) {
    const product = optionsModalProduct;
    if (!product) return;

    // Même garde que handleAdd — le bouton de confirmation de la modal est
    // déjà désactivé quand le commerçant est fermé (voir prop `canOrder`
    // passée à ProductOptionsModal), ceci est une sécurité supplémentaire.
    if (!pro.isOpen) {
      Alert.alert(
        pro.openReason === "VACATION" ? "Commerçant en vacances" : "Commerçant fermé",
        "Ce commerçant n'accepte pas de commande pour le moment."
      );
      return;
    }

    // Un id de ligne de panier différent par combinaison d'options choisie
    // (deux "Poke Saumon" avec des tailles différentes doivent rester deux
    // lignes distinctes), en combinant l'id produit avec les options triées.
    // Idem pour l'instruction spécifique (22/08/2026, sur demande explicite
    // du Pro) : deux "Poke Saumon" avec des instructions différentes ("bien
    // cuit" vs "sans oignon") doivent aussi rester deux lignes séparées --
    // sinon la 2e commande fusionnerait en quantité avec la 1ère et
    // l'instruction de la 1ère ligne serait perdue côté ticket.
    const optionsKey = Object.entries(selection.options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join("|");
    const instructionsKey = selection.specialInstructions ? `note:${selection.specialInstructions}` : "";
    const lineKey = [optionsKey, instructionsKey].filter(Boolean).join("|");
    const lineId = lineKey ? `${product.id}__${lineKey}` : product.id;

    addItem(
      {
        id: lineId,
        productId: product.id,
        name: product.name,
        emoji: product.image ?? "🍽️",
        unitPrice: Number(product.price) + selection.extraPrice,
        optionsLabel: selection.optionsLabel || undefined,
        options: Object.keys(selection.options).length > 0 ? selection.options : undefined,
        specialInstructions: selection.specialInstructions,
      },
      pro.id,
      pro.businessName,
      pro.pickupAddressId,
      pro.pickupLat,
      pro.pickupLng
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

        <View className="mx-5 mt-4 flex-row items-start gap-3">
          {/* Logo du Pro — petit avatar rond à côté du nom (24/09/2026, sur
              demande explicite : jusqu'ici seule la photo de couverture
              (pro.coverImage) était affichée en haut, le logo (pro.logo)
              n'apparaissait nulle part sur cette fiche). */}
          {pro.logo && (
            <Image
              source={{ uri: pro.logo }}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: pro.gradientTo }}
            />
          )}
          <View className="flex-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="font-heading text-xl font-bold text-nuit">{pro.businessName}</Text>
              {/* Badge pack partenaire — visible uniquement pour les packs payants
                  (voir apps/api/src/lib/partnerPacks.ts pour la définition des
                  packs), jamais pour FREE qui n'a pas de mise en avant spécifique. */}
              {pro.subscriptionType === "PREMIUM" && (
                <View className="flex-row items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5">
                  <Text style={{ fontSize: 10 }}>⭐</Text>
                  <Text className="text-[10px] font-bold text-amber-700">Premium</Text>
                </View>
              )}
              {pro.subscriptionType === "PREMIUM_PLUS" && (
                <View className="flex-row items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5">
                  <Text style={{ fontSize: 10 }}>👑</Text>
                  <Text className="text-[10px] font-bold text-violet-700">Premium+</Text>
                </View>
              )}
            </View>
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
          </View>
        </View>

        {/* Description du Pro — absente de cette fiche jusqu'ici alors
            qu'elle est déjà saisie côté Pro et renvoyée par l'API
            (pro.description, voir apps/api/src/app/api/pros/route.ts). */}
        {pro.description && (
          <View className="mx-5 mt-3">
            <Text className="text-[13px] leading-5 text-gris">{pro.description}</Text>
          </View>
        )}

        <BusinessInfoCard pro={pro} />

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

        {categories.length > 0 && (
          <View className="mt-6">
            <Text className="mx-5 mb-3 font-heading text-base font-bold text-nuit">Catégories</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            >
              {categories.map((category) => {
                const items = grouped[category];
                const photo = categoryTilePhoto(category, items);
                const isSelected = category === selectedCategory;
                return (
                  <Pressable key={category} onPress={() => setSelectedCategory(category)} style={{ width: 76 }}>
                    <View
                      className="items-center justify-center self-center overflow-hidden rounded-full"
                      style={{
                        height: 68,
                        width: 68,
                        backgroundColor: "#E8F5E9",
                        borderWidth: isSelected ? 2.5 : 0,
                        borderColor: "#2ECC71",
                      }}
                    >
                      {photo ? (
                        <Image source={{ uri: photo }} style={{ height: "100%", width: "100%" }} resizeMode="cover" />
                      ) : (
                        <Text style={{ fontSize: 28 }}>{categoryTileEmoji(category)}</Text>
                      )}
                    </View>
                    <Text
                      numberOfLines={2}
                      className={`mt-1.5 text-center text-[12px] ${
                        isSelected ? "font-bold text-golfe-green" : "font-medium text-nuit"
                      }`}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {selectedCategory && grouped[selectedCategory] && (
          <View className="mt-5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
            >
              {grouped[selectedCategory].map((product) => (
                <Pressable
                  key={product.id}
                  onPress={() => handleOpenProductDetail(product)}
                  className="overflow-hidden rounded-sm bg-gris-light"
                  style={{ width: 136 }}
                >
                  <View
                    className="items-center justify-center overflow-hidden"
                    style={{ height: 100, backgroundColor: "#2ECC71" }}
                  >
                    {product.image?.startsWith("http") ? (
                      <Image source={{ uri: product.image }} style={{ height: "100%", width: "100%" }} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 32 }}>{product.image ?? "🍽️"}</Text>
                    )}
                  </View>
                  <View className="p-2.5">
                    <View className="flex-row items-center gap-1">
                      <Text numberOfLines={1} className="flex-1 text-[13px] font-semibold text-nuit">
                        {product.name}
                      </Text>
                      {product.rating != null && (product.ratingCount ?? 0) > 0 && (
                        <Text className="text-[10px] font-bold text-corail">⭐ {Number(product.rating).toFixed(1)}</Text>
                      )}
                    </View>
                    <View className="mt-1.5 flex-row items-center justify-between">
                      <Text className="text-[13px] font-bold text-golfe-green">
                        {Number(product.price).toFixed(2).replace(".", ",")} €
                      </Text>
                      <Pressable
                        onPress={() => handleQuickAdd(product)}
                        className="h-6 w-6 items-center justify-center rounded-full bg-golfe-green"
                      >
                        <Text style={{ fontSize: 13, color: "white", fontWeight: "700" }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Avis clients — miroir de ce que le Pro voit déjà dans sa propre
            app (page "Avis clients"), mais en lecture seule côté client :
            uniquement les avis visibles (isVisible=true), voir
            GET /api/pros/[proId]/reviews. */}
        <View className="mx-5 mb-4 mt-10 border-t border-gris-light pt-6">
          <Text className="mb-4 font-heading text-base font-bold text-nuit">⭐ Avis clients</Text>

          {reviewsStatus === "loading" && reviews.length === 0 && (
            <ActivityIndicator color="#2ECC71" />
          )}

          {reviewsStatus === "loaded" && reviews.length === 0 && (
            <Text className="text-sm text-gris">Aucun avis pour le moment.</Text>
          )}

          {reviews.map((review) => (
            <View key={review.id} className="mb-3 rounded-sm bg-gris-light p-3.5">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-nuit">
                  {review.client?.user?.firstName ?? "Client"}
                </Text>
                <Text className="text-xs font-bold text-corail">⭐ {review.proRating}</Text>
              </View>
              {review.proComment && <Text className="text-sm text-nuit">{review.proComment}</Text>}
              {review.proReply && (
                <View className="mt-2 rounded-sm bg-white p-2.5">
                  <Text className="mb-0.5 text-xs font-semibold text-golfe-green">
                    Réponse de {pro.businessName}
                  </Text>
                  <Text className="text-xs text-nuit">{review.proReply}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <FloatingCart onPress={onOpenCart} />

      {optionsModalProduct && (
        <ProductOptionsModal
          product={optionsModalProduct}
          canOrder={pro.isOpen}
          onClose={() => setOptionsModalProduct(null)}
          onConfirm={handleConfirmOptions}
        />
      )}
    </SafeAreaView>
  );
}

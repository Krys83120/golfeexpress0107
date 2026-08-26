import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Product, ProductOption, ProductReview } from "@golfeexpress/types";
import { fetchProductReviews } from "@/services/prosApi";

interface ProductOptionsModalProps {
  product: Product;
  /** false si le commerçant est actuellement fermé — la fiche produit
   * (photos, description, options) reste consultable, mais la confirmation
   * de commande est désactivée et relabellisée. Par défaut true (consultation
   * hors contexte fiche Pro, ex: deep-link). */
  canOrder?: boolean;
  onClose: () => void;
  onConfirm: (selection: {
    options: Record<string, string>;
    optionsLabel: string;
    extraPrice: number;
    /** Commentaire libre du client pour CET article (ex: "bien cuit") —
     * uniquement rempli si product.allowSpecialInstructions est actif,
     * sinon toujours undefined (voir handleConfirm ci-dessous). */
    specialInstructions?: string;
  }) => void;
}

/**
 * Sélections en cours : nom du groupe -> (nom du choix -> quantité choisie).
 * Une quantité vaut 1 pour un choix normal (case à cocher / radio classique)
 * et peut monter au-delà de 1 uniquement pour un choix "quantité multiple"
 * (OptionChoice.allowMultipleQty, réglé par le Pro dans ProductFormModal.tsx
 * -- ex: "Bacon" x4). Un choix non sélectionné n'a jamais d'entrée dans la
 * Map (invariant maintenu par toggleChoice/adjustChoiceQty ci-dessous), donc
 * `.size` reste un indicateur fiable de "au moins un choix sélectionné",
 * comme avec l'ancien Set<string>.
 */
type SelectionState = Record<string, Map<string, number>>;

// Quantité maximale acceptée pour un même choix "quantité multiple" (ex:
// "Bacon" x20 maxi) -- garde-fou UX pur, revalidé côté serveur (voir
// MAX_QTY_PER_CHOICE dans orders/route.ts, même valeur).
const MAX_QTY_PER_CHOICE = 20;

function totalPicksInGroup(chosen: Map<string, number> | undefined): number {
  if (!chosen) return 0;
  let total = 0;
  for (const qty of chosen.values()) total += qty;
  return total;
}

function isSelectionComplete(options: ProductOption[], selection: SelectionState): boolean {
  return options.every((group) => !group.isRequired || (selection[group.name]?.size ?? 0) > 0);
}

export function ProductOptionsModal({ product, canOrder = true, onClose, onConfirm }: ProductOptionsModalProps) {
  const options = product.options ?? [];
  // Number(...) défensif — un prix reçu en texte (bug de sérialisation
  // Decimal déjà rencontré côté API) ferait planter .toFixed() sinon.
  const basePrice = Number(product.price);
  const [selection, setSelection] = useState<SelectionState>({});
  // Commentaire libre pour cet article — champ affiché uniquement si le Pro
  // a activé "Instructions spécifiques" sur ce produit (voir ProductFormModal
  // côté Pro). Réinitialisé implicitement à chaque nouvelle ouverture de la
  // modal puisque ce composant est remonté (product.id change de clé parent).
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Toutes les photos disponibles : la principale d'abord, puis les
  // photos de galerie — le clic sur une miniature change simplement quelle
  // URL est affichée en grand, sans recharger le composant.
  const allPhotos = [product.image, ...(product.additionalImages ?? [])].filter(
    (url): url is string => !!url && url.startsWith("http")
  );
  const [activePhoto, setActivePhoto] = useState<string | undefined>(allPhotos[0]);

  // Avis clients sur CE produit précisément (indépendants des avis sur le
  // commerçant) — voir GET /api/products/[productId]/reviews.
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsStatus, setReviewsStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setReviewsStatus("loading");
    fetchProductReviews(product.id)
      .then((data) => {
        if (!cancelled) {
          setReviews(data);
          setReviewsStatus("loaded");
        }
      })
      .catch(() => {
        if (!cancelled) setReviewsStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  function toggleChoice(group: ProductOption, choiceName: string) {
    const choice = group.choices.find((c) => c.name === choiceName);
    // Un choix en rupture (voir ProductFormModal.tsx côté Pro) reste visible
    // pour info mais ne peut pas être sélectionné -- défense en profondeur en
    // plus du disabled sur le Pressable ci-dessous (ex: appel direct à cette
    // fonction, mise à jour partielle du state...).
    if (choice && choice.isAvailable === false) return;
    setSelection((prev) => {
      const current = new Map(prev[group.name] ?? []);
      if (group.isMultiple) {
        if (current.has(choiceName)) {
          current.delete(choiceName);
        } else {
          // Limite de choix pour ce groupe (ex: "3 protéines maxi") réglée
          // par le Pro sur sa fiche produit (ProductOption.maxChoices, voir
          // aussi assertWithinMaxChoices côté serveur qui revalide cette
          // même limite à la création de la commande). Compte le total des
          // quantités du groupe (pas juste le nombre de choix distincts), la
          // même limite s'appliquant qu'il s'agisse de choix répétés ou non.
          // Une fois la limite atteinte, un nouveau choix est simplement
          // ignoré -- décocher un choix déjà sélectionné reste toujours
          // possible juste au-dessus.
          if (group.maxChoices != null && totalPicksInGroup(current) >= group.maxChoices) return prev;
          current.set(choiceName, 1);
        }
      } else {
        // Choix unique : sélectionner un choix remplace le précédent.
        current.clear();
        current.set(choiceName, 1);
      }
      return { ...prev, [group.name]: current };
    });
  }

  /**
   * Ajuste la quantité d'un choix "quantité multiple" (OptionChoice.
   * allowMultipleQty, ex: "Bacon" x4 -- voir ProductFormModal.tsx côté Pro)
   * de `delta` (+1/-1 depuis le stepper). Une quantité qui retombe à 0
   * retire l'entrée de la Map plutôt que de la garder à 0, pour conserver
   * l'invariant "présent dans la Map = sélectionné" utilisé ailleurs
   * (isSelectionComplete, extraPrice, handleConfirm...).
   */
  function adjustChoiceQty(group: ProductOption, choiceName: string, delta: number) {
    const choice = group.choices.find((c) => c.name === choiceName);
    if (choice && choice.isAvailable === false) return;
    setSelection((prev) => {
      const current = new Map(prev[group.name] ?? []);
      const currentQty = current.get(choiceName) ?? 0;
      const nextQty = currentQty + delta;
      if (nextQty <= 0) {
        current.delete(choiceName);
      } else {
        if (nextQty > MAX_QTY_PER_CHOICE) return prev;
        // Même limite de groupe que toggleChoice ci-dessus (ex: "3 maxi"),
        // en comptant le total des AUTRES choix du groupe + la nouvelle
        // quantité de celui-ci.
        let totalOthers = 0;
        for (const [name, qty] of current) {
          if (name !== choiceName) totalOthers += qty;
        }
        if (group.maxChoices != null && totalOthers + nextQty > group.maxChoices) return prev;
        current.set(choiceName, nextQty);
      }
      return { ...prev, [group.name]: current };
    });
  }

  const extraPrice = useMemo(() => {
    let sum = 0;
    for (const group of options) {
      const chosen = selection[group.name];
      if (!chosen) continue;
      for (const [choiceName, qty] of chosen) {
        const choice = group.choices.find((c) => c.name === choiceName);
        if (choice) sum += Number(choice.priceModifier) * qty;
      }
    }
    return sum;
  }, [selection, options]);

  const totalPrice = basePrice + extraPrice;
  const optionsComplete = isSelectionComplete(options, selection);
  const canConfirm = optionsComplete && canOrder;

  function handleConfirm() {
    if (!canConfirm) return;
    const flatOptions: Record<string, string> = {};
    const labelParts: string[] = [];
    for (const group of options) {
      const chosen = selection[group.name];
      if (chosen && chosen.size > 0) {
        // Encode la quantité en répétant le nom du choix dans la chaîne CSV
        // envoyée à l'API (ex: "Bacon, Bacon, Bacon, Bacon" pour x4) --
        // computeOptionsSurcharge et assertQuantifiableChoices côté serveur
        // (orders/route.ts) savent déjà lire ce format, aucun changement
        // d'API nécessaire. Le libellé affiché au client/sur le ticket reste
        // lui condensé ("Bacon x4"), voir groupLabelParts ci-dessous.
        const names: string[] = [];
        const groupLabelParts: string[] = [];
        for (const [choiceName, qty] of chosen) {
          for (let i = 0; i < qty; i++) names.push(choiceName);
          groupLabelParts.push(qty > 1 ? `${choiceName} x${qty}` : choiceName);
        }
        flatOptions[group.name] = names.join(", ");
        labelParts.push(groupLabelParts.join(", "));
      }
    }
    const optionsLabel = labelParts.join(", ");
    const trimmedInstructions = specialInstructions.trim();
    onConfirm({
      options: flatOptions,
      optionsLabel,
      extraPrice,
      // Ne jamais envoyer d'instruction si le Pro n'a pas activé le réglage
      // -- le champ n'est de toute façon pas affiché dans ce cas, mais on se
      // protège ici aussi (défense en profondeur, cf. le même choix côté
      // serveur dans orders/route.ts).
      specialInstructions: product.allowSpecialInstructions && trimmedInstructions ? trimmedInstructions : undefined,
    });
  }

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.sheet} edges={["bottom"]}>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={styles.header}>
            <View style={{ height: 220, backgroundColor: "#E8F5E9" }}>
              {activePhoto ? (
                <Image source={{ uri: activePhoto }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 56 }}>{product.image ?? "🍽️"}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={{ fontSize: 16, color: "#1A1A2E" }}>✕</Text>
            </Pressable>
          </View>

          {allPhotos.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
              {allPhotos.map((url) => (
                <Pressable key={url} onPress={() => setActivePhoto(url)} style={styles.thumbWrap}>
                  <Image
                    source={{ uri: url }}
                    style={[styles.thumb, url === activePhoto && styles.thumbActive]}
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={styles.title}>{product.name}</Text>
              {product.rating != null && (product.ratingCount ?? 0) > 0 && (
                <View style={styles.ratingBadge}>
                  <Text style={{ fontSize: 11 }}>⭐</Text>
                  <Text style={styles.ratingBadgeText}>
                    {Number(product.rating).toFixed(1)} ({product.ratingCount})
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.price}>{basePrice.toFixed(2).replace(".", ",")} €</Text>
            {product.description && <Text style={styles.description}>{product.description}</Text>}

            {product.hasExtraFeeNotice && (
              <View style={styles.feeNotice}>
                <Text style={styles.feeNoticeText}>
                  ℹ️ Des frais supplémentaires peuvent être appliqués pour cette option.
                </Text>
              </View>
            )}

            {options.map((group) => {
              const chosen = selection[group.name] ?? new Map<string, number>();
              return (
                <View key={group.id} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <View>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupHint}>
                        {group.isMultiple ? "Choisissez-en un ou plusieurs" : "Choisissez-en 1"}
                      </Text>
                    </View>
                    {group.isRequired && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Obligatoire</Text>
                      </View>
                    )}
                  </View>

                  {group.choices.map((choice) => {
                    const qty = chosen.get(choice.name) ?? 0;
                    const isSelected = qty > 0;
                    // isAvailable absent (ancien choix jamais ré-enregistré
                    // depuis l'ajout du champ) = disponible par défaut.
                    const isUnavailable = choice.isAvailable === false;
                    const isQuantifiable = choice.allowMultipleQty === true;

                    if (isQuantifiable && qty === 0) {
                      // Choix "quantité multiple" (ex: "Bacon" x4, réglé par
                      // le Pro dans ProductFormModal.tsx) PAS ENCORE
                      // sélectionné : même apparence tappable (case à cocher)
                      // qu'un choix normal ci-dessous -- un premier tap
                      // sélectionne directement 1 unité (voir la branche
                      // qty > 0 juste après, qui prend le relais avec le
                      // stepper +/-). Plus intuitif que de partir sur un
                      // stepper à 0 où il faudrait deviner qu'il faut appuyer
                      // sur "+" pour sélectionner ce choix.
                      return (
                        <Pressable
                          key={choice.id}
                          onPress={() => adjustChoiceQty(group, choice.name, 1)}
                          disabled={isUnavailable}
                          style={[styles.choiceRow, isUnavailable && { opacity: 0.45 }]}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={styles.choiceName}>{choice.name}</Text>
                              {isUnavailable && (
                                <View style={styles.unavailableBadge}>
                                  <Text style={styles.unavailableBadgeText}>Indisponible</Text>
                                </View>
                              )}
                            </View>
                            {!isUnavailable && Number(choice.priceModifier) > 0 && (
                              <Text style={styles.choicePrice}>+{Number(choice.priceModifier).toFixed(2).replace(".", ",")} € / unité</Text>
                            )}
                          </View>
                          {!isUnavailable && <View style={styles.checkbox} />}
                        </Pressable>
                      );
                    }

                    if (isQuantifiable) {
                      // Déjà sélectionné (qty >= 1) : stepper complet -/qty/+.
                      // Repasser à 0 via "-" déselectionne entièrement le
                      // choix, qui revient à l'apparence "case à cocher"
                      // ci-dessus au prochain rendu.
                      return (
                        <View key={choice.id} style={[styles.choiceRow, isUnavailable && { opacity: 0.45 }]}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={styles.choiceName}>{choice.name}</Text>
                              {isUnavailable && (
                                <View style={styles.unavailableBadge}>
                                  <Text style={styles.unavailableBadgeText}>Indisponible</Text>
                                </View>
                              )}
                            </View>
                            {!isUnavailable && Number(choice.priceModifier) > 0 && (
                              <Text style={styles.choicePrice}>+{Number(choice.priceModifier).toFixed(2).replace(".", ",")} € / unité</Text>
                            )}
                          </View>
                          {!isUnavailable && (
                            <View style={styles.stepper}>
                              <Pressable onPress={() => adjustChoiceQty(group, choice.name, -1)} style={styles.stepperBtn}>
                                <Text style={styles.stepperBtnText}>−</Text>
                              </Pressable>
                              <Text style={styles.stepperQty}>{qty}</Text>
                              <Pressable onPress={() => adjustChoiceQty(group, choice.name, 1)} style={styles.stepperBtn}>
                                <Text style={styles.stepperBtnText}>+</Text>
                              </Pressable>
                            </View>
                          )}
                        </View>
                      );
                    }

                    return (
                      <Pressable
                        key={choice.id}
                        onPress={() => toggleChoice(group, choice.name)}
                        disabled={isUnavailable}
                        style={[styles.choiceRow, isUnavailable && { opacity: 0.45 }]}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.choiceName}>{choice.name}</Text>
                            {isUnavailable && (
                              <View style={styles.unavailableBadge}>
                                <Text style={styles.unavailableBadgeText}>Indisponible</Text>
                              </View>
                            )}
                          </View>
                          {!isUnavailable && Number(choice.priceModifier) > 0 && (
                            <Text style={styles.choicePrice}>+{Number(choice.priceModifier).toFixed(2).replace(".", ",")} €</Text>
                          )}
                        </View>
                        {!isUnavailable && (
                          <View
                            style={[
                              group.isMultiple ? styles.checkbox : styles.radio,
                              isSelected && { backgroundColor: "#2ECC71", borderColor: "#2ECC71" },
                            ]}
                          >
                            {isSelected && <Text style={{ fontSize: 11, color: "white", fontWeight: "700" }}>✓</Text>}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}

            {product.allowSpecialInstructions && (
              <View style={styles.group}>
                <Text style={styles.groupName}>Instructions spécifiques</Text>
                <Text style={styles.groupHint}>Une précision pour ce produit ? (optionnel)</Text>
                <TextInput
                  value={specialInstructions}
                  onChangeText={setSpecialInstructions}
                  placeholder="Ex : bien cuit, sans oignon..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.instructionsInput}
                  multiline
                  maxLength={300}
                />
              </View>
            )}

            {/* Avis clients sur ce produit précisément — indépendants des
                avis sur le commerçant (voir GET /api/products/[productId]/reviews). */}
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 16 }}>
              <Text style={styles.groupName}>Avis sur ce produit</Text>
              {reviewsStatus === "loading" && (
                <Text style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>Chargement des avis...</Text>
              )}
              {reviewsStatus === "loaded" && reviews.length === 0 && (
                <Text style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>Aucun avis pour le moment.</Text>
              )}
              {reviews.map((review) => (
                <View key={review.id} style={styles.productReviewCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#1A1A2E" }}>
                      {review.client?.user?.firstName ?? "Client"}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#FF6B35" }}>⭐ {review.rating}</Text>
                  </View>
                  {review.comment && <Text style={{ marginTop: 4, fontSize: 13, color: "#1A1A2E" }}>{review.comment}</Text>}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            style={[styles.confirmBtn, { opacity: canConfirm ? 1 : 0.5 }, !canOrder && { backgroundColor: "#9CA3AF" }]}
          >
            <Text style={styles.confirmText}>
              {canOrder
                ? `Ajouter à la commande • ${totalPrice.toFixed(2).replace(".", ",")} €`
                : "Commerçant fermé pour le moment"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "white" },
  sheet: { flex: 1 },
  header: { position: "relative" },
  thumbRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  thumbWrap: { marginRight: 8 },
  thumb: { height: 56, width: 56, borderRadius: 8, borderWidth: 2, borderColor: "transparent" },
  thumbActive: { borderColor: "#2ECC71" },
  closeBtn: {
    position: "absolute",
    top: 16,
    left: 16,
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1A1A2E" },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingBadgeText: { fontSize: 11, fontWeight: "700", color: "#FF6B35" },
  productReviewCard: { marginTop: 10, borderRadius: 8, backgroundColor: "#F9FAFB", padding: 12 },
  price: { marginTop: 4, fontSize: 15, color: "#6B7280" },
  description: { marginTop: 8, fontSize: 13, lineHeight: 19, color: "#6B7280" },
  feeNotice: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  feeNoticeText: { fontSize: 12, color: "#8A5A00", lineHeight: 17 },
  instructionsInput: {
    marginTop: 10,
    minHeight: 70,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#1A1A2E",
    textAlignVertical: "top",
  },
  group: { marginTop: 20 },
  groupHeader: { marginBottom: 8, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  groupName: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  groupHint: { marginTop: 1, fontSize: 12, color: "#6B7280" },
  requiredBadge: { borderRadius: 999, backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 4 },
  requiredText: { fontSize: 11, fontWeight: "600", color: "#1A1A2E" },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingVertical: 12,
  },
  choiceName: { fontSize: 14, color: "#1A1A2E" },
  choicePrice: { marginTop: 1, fontSize: 12, color: "#6B7280" },
  unavailableBadge: { borderRadius: 999, backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2 },
  unavailableBadgeText: { fontSize: 10, fontWeight: "600", color: "#6B7280" },
  radio: { height: 22, width: 22, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 2, borderColor: "#D1D5DB" },
  checkbox: { height: 22, width: 22, alignItems: "center", justifyContent: "center", borderRadius: 6, borderWidth: 2, borderColor: "#D1D5DB" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepperBtn: {
    height: 26,
    width: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#D1D5DB",
  },
  stepperBtnText: { fontSize: 15, fontWeight: "700", color: "#1A1A2E" },
  stepperQty: { minWidth: 16, textAlign: "center", fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  footer: { borderTopWidth: 1, borderTopColor: "#F3F4F6", padding: 16 },
  confirmBtn: { alignItems: "center", borderRadius: 16, backgroundColor: "#1A1A2E", paddingVertical: 16 },
  confirmText: { fontSize: 15, fontWeight: "700", color: "white" },
});

import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Product, ProductOption } from "@golfeexpress/types";

interface ProductOptionsModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (selection: { options: Record<string, string>; optionsLabel: string; extraPrice: number }) => void;
}

/** Sélections en cours : nom du groupe -> ensemble des noms de choix cochés. */
type SelectionState = Record<string, Set<string>>;

function isSelectionComplete(options: ProductOption[], selection: SelectionState): boolean {
  return options.every((group) => !group.isRequired || (selection[group.name]?.size ?? 0) > 0);
}

export function ProductOptionsModal({ product, onClose, onConfirm }: ProductOptionsModalProps) {
  const options = product.options ?? [];
  // Number(...) défensif — un prix reçu en texte (bug de sérialisation
  // Decimal déjà rencontré côté API) ferait planter .toFixed() sinon.
  const basePrice = Number(product.price);
  const [selection, setSelection] = useState<SelectionState>({});

  // Toutes les photos disponibles : la principale d'abord, puis les
  // photos de galerie — le clic sur une miniature change simplement quelle
  // URL est affichée en grand, sans recharger le composant.
  const allPhotos = [product.image, ...(product.additionalImages ?? [])].filter(
    (url): url is string => !!url && url.startsWith("http")
  );
  const [activePhoto, setActivePhoto] = useState<string | undefined>(allPhotos[0]);

  function toggleChoice(group: ProductOption, choiceName: string) {
    setSelection((prev) => {
      const current = new Set(prev[group.name] ?? []);
      if (group.isMultiple) {
        if (current.has(choiceName)) current.delete(choiceName);
        else current.add(choiceName);
      } else {
        // Choix unique : sélectionner un choix remplace le précédent.
        current.clear();
        current.add(choiceName);
      }
      return { ...prev, [group.name]: current };
    });
  }

  const extraPrice = useMemo(() => {
    let sum = 0;
    for (const group of options) {
      const chosen = selection[group.name];
      if (!chosen) continue;
      for (const choiceName of chosen) {
        const choice = group.choices.find((c) => c.name === choiceName);
        if (choice) sum += Number(choice.priceModifier);
      }
    }
    return sum;
  }, [selection, options]);

  const totalPrice = basePrice + extraPrice;
  const canConfirm = isSelectionComplete(options, selection);

  function handleConfirm() {
    const flatOptions: Record<string, string> = {};
    for (const group of options) {
      const chosen = selection[group.name];
      if (chosen && chosen.size > 0) {
        flatOptions[group.name] = [...chosen].join(", ");
      }
    }
    const optionsLabel = Object.values(flatOptions).join(", ");
    onConfirm({ options: flatOptions, optionsLabel, extraPrice });
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
              <Ionicons name="close" size={18} color="#1A1A2E" />
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
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.price}>{basePrice.toFixed(2).replace(".", ",")} €</Text>
            {product.description && <Text style={styles.description}>{product.description}</Text>}

            {options.map((group) => {
              const chosen = selection[group.name] ?? new Set<string>();
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
                    const isSelected = chosen.has(choice.name);
                    return (
                      <Pressable
                        key={choice.id}
                        onPress={() => toggleChoice(group, choice.name)}
                        style={styles.choiceRow}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.choiceName}>{choice.name}</Text>
                          {Number(choice.priceModifier) > 0 && (
                            <Text style={styles.choicePrice}>+{Number(choice.priceModifier).toFixed(2).replace(".", ",")} €</Text>
                          )}
                        </View>
                        <View
                          style={[
                            group.isMultiple ? styles.checkbox : styles.radio,
                            isSelected && { backgroundColor: "#2ECC71", borderColor: "#2ECC71" },
                          ]}
                        >
                          {isSelected && <Ionicons name="checkmark" size={13} color="white" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            style={[styles.confirmBtn, { opacity: canConfirm ? 1 : 0.5 }]}
          >
            <Text style={styles.confirmText}>
              Ajouter à la commande • {totalPrice.toFixed(2).replace(".", ",")} €
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
  price: { marginTop: 4, fontSize: 15, color: "#6B7280" },
  description: { marginTop: 8, fontSize: 13, lineHeight: 19, color: "#6B7280" },
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
  radio: { height: 22, width: 22, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 2, borderColor: "#D1D5DB" },
  checkbox: { height: 22, width: 22, alignItems: "center", justifyContent: "center", borderRadius: 6, borderWidth: 2, borderColor: "#D1D5DB" },
  footer: { borderTopWidth: 1, borderTopColor: "#F3F4F6", padding: 16 },
  confirmBtn: { alignItems: "center", borderRadius: 16, backgroundColor: "#1A1A2E", paddingVertical: 16 },
  confirmText: { fontSize: 15, fontWeight: "700", color: "white" },
});

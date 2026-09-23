import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OnlineToggleHeader } from "@/components/OnlineToggleHeader";
import { EarningsCard } from "@/components/EarningsCard";
import { OrderCard } from "@/components/OrderCard";
import { CurrentDeliveryCard } from "@/components/CurrentDeliveryCard";
import { ParcelOrderCard } from "@/components/ParcelOrderCard";
import { CurrentParcelDeliveryCard } from "@/components/CurrentParcelDeliveryCard";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Catégorie de commandes disponibles actuellement dépliée -- null = écran
 * des 2 vignettes (23/09/2026, retour de Krys : ergonomiquement plus clair
 * que les 2 listes empilées en permanence, surtout sur petit écran). Une
 * seule catégorie dépliée à la fois, jamais les deux en même temps.
 */
type BrowseCategory = "orders" | "parcels" | null;

export function HomeScreen() {
  const isOnline = useRiderSessionStore((s) => s.isOnline);
  const activeDelivery = useRiderSessionStore((s) => s.activeDelivery);
  const availableOrders = useRiderSessionStore((s) => s.availableOrders);
  const availableOrdersStatus = useRiderSessionStore((s) => s.availableOrdersStatus);
  const loadAvailableOrders = useRiderSessionStore((s) => s.loadAvailableOrders);
  const loadActiveDelivery = useRiderSessionStore((s) => s.loadActiveDelivery);
  const handleAcceptOrder = useRiderSessionStore((s) => s.handleAcceptOrder);
  const cancelledDeliveryNotice = useRiderSessionStore((s) => s.cancelledDeliveryNotice);
  const dismissCancelledDeliveryNotice = useRiderSessionStore((s) => s.dismissCancelledDeliveryNotice);

  // Colis Express (23/09/2026, finition du workflow Livreur) -- voir
  // useRiderSessionStore.ts pour le détail de ces actions/états.
  const activeParcelDelivery = useRiderSessionStore((s) => s.activeParcelDelivery);
  const availableParcelOrders = useRiderSessionStore((s) => s.availableParcelOrders);
  const availableParcelOrdersStatus = useRiderSessionStore((s) => s.availableParcelOrdersStatus);
  const loadAvailableParcelOrders = useRiderSessionStore((s) => s.loadAvailableParcelOrders);
  const loadActiveParcelDelivery = useRiderSessionStore((s) => s.loadActiveParcelDelivery);
  const handleAcceptParcelOrder = useRiderSessionStore((s) => s.handleAcceptParcelOrder);

  const riderStatus = useAuthStore((s) => s.profile?.status);

  // Vignettes "Commandes" / "Colis Express" (23/09/2026) -- voir BrowseCategory.
  const [activeCategory, setActiveCategory] = useState<BrowseCategory>(null);

  useEffect(() => {
    loadActiveDelivery();
    loadActiveParcelDelivery();
    if (isOnline) {
      loadAvailableOrders();
      loadAvailableParcelOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Repasser hors ligne referme une catégorie ouverte -- évite de rester
  // bloqué sur une liste vide avec un message qui ne correspond plus à rien.
  useEffect(() => {
    if (!isOnline) setActiveCategory(null);
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline || activeDelivery || activeParcelDelivery) return;
    const interval = setInterval(() => {
      loadAvailableOrders();
      loadAvailableParcelOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, [isOnline, activeDelivery, activeParcelDelivery]);

  // Tant qu'une livraison est en cours, on revérifie régulièrement son
  // statut côté serveur -- seul moyen pour ce livreur de savoir qu'elle a
  // été annulée entre-temps (ex: annulation forcée par un Admin), puisque
  // l'app ne s'abonne pas au temps réel Supabase sur la table Order (voir
  // useRiderSessionStore.ts, loadActiveDelivery).
  useEffect(() => {
    if (!activeDelivery) return;
    const interval = setInterval(loadActiveDelivery, 20000);
    return () => clearInterval(interval);
  }, [Boolean(activeDelivery)]);

  // Même principe pour Colis Express (23/09/2026).
  useEffect(() => {
    if (!activeParcelDelivery) return;
    const interval = setInterval(loadActiveParcelDelivery, 20000);
    return () => clearInterval(interval);
  }, [Boolean(activeParcelDelivery)]);

  useEffect(() => {
    if (!cancelledDeliveryNotice) return;
    Alert.alert("Commande annulée", cancelledDeliveryNotice, [
      { text: "OK", onPress: dismissCancelledDeliveryNotice },
    ]);
  }, [cancelledDeliveryNotice]);

  async function handleAccept(orderId: string) {
    try {
      await handleAcceptOrder(orderId);
    } catch {
      loadAvailableOrders();
    }
  }

  async function handleAcceptParcel(parcelOrderId: string) {
    try {
      await handleAcceptParcelOrder(parcelOrderId);
    } catch {
      loadAvailableParcelOrders();
    }
  }

  if (riderStatus === "PENDING") {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
          <OnlineToggleHeader />
        </SafeAreaView>
        <View style={styles.pendingWrap}>
          <Text style={styles.pendingEmoji}>⏳</Text>
          <Text style={styles.pendingTitle}>Compte en attente de validation</Text>
          <Text style={styles.pendingBody}>
            Notre équipe vérifie vos documents. Vous pourrez passer en ligne dès que votre compte sera validé.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <SafeAreaView edges={["top"]} style={styles.headerSafeArea}>
          <OnlineToggleHeader />
        </SafeAreaView>

        <EarningsCard />

        {activeDelivery ? (
          <CurrentDeliveryCard />
        ) : activeParcelDelivery ? (
          <CurrentParcelDeliveryCard />
        ) : !isOnline ? (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapEmoji}>🗺️</Text>
            <Text style={styles.mapCaption}>Passez en ligne pour recevoir des commandes</Text>
          </View>
        ) : activeCategory === null ? (
          // VIGNETTES -- écran d'accueil de la recherche (23/09/2026, retour
          // de Krys : plus lisible que les 2 listes empilées en permanence,
          // surtout quand une seule des deux catégories a du contenu).
          <>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapEmoji}>🗺️</Text>
              <Text style={styles.mapCaption}>Recherche de commandes à proximité...</Text>
            </View>

            <View style={styles.tilesRow}>
              <Pressable
                onPress={() => setActiveCategory("orders")}
                style={[styles.tile, { backgroundColor: "#FFF3E0" }]}
              >
                <Text style={styles.tileEmoji}>📋</Text>
                <Text style={styles.tileLabel}>Commandes</Text>
                <Text style={[styles.tileCount, { color: "#F97316" }]}>
                  {availableOrdersStatus === "loading"
                    ? "..."
                    : availableOrdersStatus === "error"
                      ? "Erreur"
                      : `${availableOrders.length} dispo`}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveCategory("parcels")}
                style={[styles.tile, { backgroundColor: "#E3F2FD" }]}
              >
                <Text style={styles.tileEmoji}>📦</Text>
                <Text style={styles.tileLabel}>Colis Express</Text>
                <Text style={[styles.tileCount, { color: "#2196F3" }]}>
                  {availableParcelOrdersStatus === "loading"
                    ? "..."
                    : availableParcelOrdersStatus === "error"
                      ? "Erreur"
                      : `${availableParcelOrders.length} dispo`}
                </Text>
              </Pressable>
            </View>
          </>
        ) : activeCategory === "orders" ? (
          <View style={styles.ordersSection}>
            <Pressable onPress={() => setActiveCategory(null)} hitSlop={8} style={styles.backRow}>
              <Text style={styles.backText}>← Retour</Text>
            </Pressable>
            <Text style={styles.ordersTitle}>
              📋 Commandes disponibles {availableOrdersStatus === "loaded" ? `(${availableOrders.length})` : ""}
            </Text>

            {availableOrdersStatus === "loading" ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color="#2ECC71" />
              </View>
            ) : availableOrdersStatus === "error" ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Impossible de charger les commandes disponibles.</Text>
                <Pressable onPress={loadAvailableOrders} style={{ marginTop: 8 }}>
                  <Text style={styles.retryText}>Réessayer</Text>
                </Pressable>
              </View>
            ) : availableOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyText}>Aucune commande disponible pour le moment</Text>
              </View>
            ) : (
              availableOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAccept={() => handleAccept(order.id)}
                  onDecline={() => {}}
                />
              ))
            )}
          </View>
        ) : (
          <View style={styles.ordersSection}>
            <Pressable onPress={() => setActiveCategory(null)} hitSlop={8} style={styles.backRow}>
              <Text style={styles.backText}>← Retour</Text>
            </Pressable>
            <Text style={styles.ordersTitle}>
              📦 Colis Express disponibles{" "}
              {availableParcelOrdersStatus === "loaded" ? `(${availableParcelOrders.length})` : ""}
            </Text>

            {availableParcelOrdersStatus === "loading" ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color="#2196F3" />
              </View>
            ) : availableParcelOrdersStatus === "error" ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Impossible de charger les colis disponibles.</Text>
                <Pressable onPress={loadAvailableParcelOrders} style={{ marginTop: 8 }}>
                  <Text style={styles.retryText}>Réessayer</Text>
                </Pressable>
              </View>
            ) : availableParcelOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📦</Text>
                <Text style={styles.emptyText}>Aucun Colis Express disponible pour le moment</Text>
              </View>
            ) : (
              availableParcelOrders.map((parcelOrder) => (
                <ParcelOrderCard
                  key={parcelOrder.id}
                  parcelOrder={parcelOrder}
                  onAccept={() => handleAcceptParcel(parcelOrder.id)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "white" },
  headerSafeArea: { backgroundColor: "#1A1A2E" },
  pendingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  pendingEmoji: { fontSize: 48 },
  pendingTitle: { marginTop: 12, textAlign: "center", fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  pendingBody: { marginTop: 8, textAlign: "center", fontSize: 14, color: "#6B7280" },
  mapPlaceholder: {
    marginHorizontal: 20,
    marginTop: 20,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
  },
  mapEmoji: { fontSize: 32 },
  mapCaption: { marginTop: 4, fontSize: 13, color: "#6B7280" },
  // Vignettes "Commandes" / "Colis Express" (23/09/2026) -- côte à côte,
  // hauteur fixe, contenu centré : même logique de carte que le reste de
  // l'app (EarningsCard, OrderCard...) mais format compact et cliquable.
  tilesRow: {
    marginTop: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 12,
  },
  tile: {
    flex: 1,
    height: 110,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  tileEmoji: { fontSize: 28 },
  tileLabel: { marginTop: 6, fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  tileCount: { marginTop: 2, fontSize: 12, fontWeight: "600" },
  backRow: { marginBottom: 8, alignSelf: "flex-start" },
  backText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  ordersSection: { marginTop: 24, paddingHorizontal: 20 },
  ordersTitle: { marginBottom: 12, fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  emptyState: { alignItems: "center", paddingVertical: 48 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { marginTop: 8, color: "#6B7280" },
  errorBox: { borderRadius: 8, backgroundColor: "#FEF2F2", padding: 16 },
  errorText: { fontSize: 14, color: "#EF4444" },
  retryText: { fontSize: 14, fontWeight: "600", color: "#2ECC71" },
});

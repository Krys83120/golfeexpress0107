import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OrderStatus, type Order } from "@golfeexpress/types";
import { fetchMyOrders } from "@/services/ordersApi";
import { getCategoryVisual } from "@/services/categoryVisuals";
import { StatusBadge } from "@/components/StatusBadge";
import { downloadOrderReceipt, emailOrderReceipt } from "@/services/documentsApi";

type Filter = "all" | "active" | "past";

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_DELIVERY,
];

interface OrdersScreenProps {
  onOpenTracking: (order: Order) => void;
  onReorder: (order: Order) => void;
  onOpenReview: (order: Order) => void;
  onReportIssue: (order: Order) => void;
}

export function OrdersScreen({ onOpenTracking, onReorder, onOpenReview, onReportIssue }: OrdersScreenProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  // Ticket de commande — état par commande (id -> action en cours), pour
  // n'afficher le spinner que sur le bouton concerné dans la liste.
  const [receiptBusy, setReceiptBusy] = useState<Record<string, "download" | "email" | undefined>>({});
  // Affiché en plus de Alert.alert (pas à sa place) : sur le web, un
  // window.alert() déclenché après un await peut être silencieusement
  // bloqué par le navigateur une fois "l'activation utilisateur" expirée
  // (déjà rencontré avec l'upload d'avatar) — ce texte persistant garantit
  // que l'utilisateur voit toujours le résultat, même si l'alerte est bloquée.
  const [receiptMessage, setReceiptMessage] = useState<Record<string, string | undefined>>({});

  async function handleDownloadReceipt(order: Order) {
    setReceiptBusy((s) => ({ ...s, [order.id]: "download" }));
    setReceiptMessage((s) => ({ ...s, [order.id]: undefined }));
    try {
      await downloadOrderReceipt(order.id, order.orderNumber);
      setReceiptMessage((s) => ({ ...s, [order.id]: "Ticket téléchargé." }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Téléchargement du ticket impossible.";
      setReceiptMessage((s) => ({ ...s, [order.id]: message }));
      Alert.alert("Erreur", message);
    } finally {
      setReceiptBusy((s) => ({ ...s, [order.id]: undefined }));
    }
  }

  async function handleEmailReceipt(order: Order) {
    setReceiptBusy((s) => ({ ...s, [order.id]: "email" }));
    setReceiptMessage((s) => ({ ...s, [order.id]: undefined }));
    try {
      const { to } = await emailOrderReceipt(order.id);
      const message = `Ticket envoyé à ${to}.`;
      setReceiptMessage((s) => ({ ...s, [order.id]: message }));
      Alert.alert("Ticket envoyé", `Le ticket de la commande ${order.orderNumber} a été envoyé à ${to}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Envoi du ticket impossible.";
      setReceiptMessage((s) => ({ ...s, [order.id]: message }));
      Alert.alert("Erreur", message);
    } finally {
      setReceiptBusy((s) => ({ ...s, [order.id]: undefined }));
    }
  }

  async function load() {
    setStatus("loading");
    try {
      const data = await fetchMyOrders();
      setOrders(data);
      setStatus("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger vos commandes.");
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = orders.filter((o) => {
    const isActive = ACTIVE_STATUSES.includes(o.status);
    if (filter === "active") return isActive;
    if (filter === "past") return !isActive;
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-5 pb-3 pt-4">
        <Text className="font-heading text-xl font-bold text-nuit">🧾 Mes commandes</Text>
      </View>

      <View className="flex-row gap-2 px-5 pb-4">
        <FilterChip label="Toutes" active={filter === "all"} onPress={() => setFilter("all")} />
        <FilterChip label="En cours" active={filter === "active"} onPress={() => setFilter("active")} />
        <FilterChip label="Historique" active={filter === "past"} onPress={() => setFilter("past")} />
      </View>

      {status === "loading" && (
        <View className="items-center py-16">
          <ActivityIndicator color="#2ECC71" />
        </View>
      )}

      {status === "error" && (
        <View className="mx-5 rounded-sm bg-red-50 p-4">
          <Text className="text-sm text-red-500">{error}</Text>
          <Pressable onPress={load} className="mt-2">
            <Text className="text-sm font-semibold text-golfe-green">Réessayer</Text>
          </Pressable>
        </View>
      )}

      {status === "loaded" && (
        <ScrollView className="px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <Text style={{ fontSize: 48 }}>🧾</Text>
              <Text className="mt-3 text-gris">Aucune commande ici</Text>
            </View>
          ) : (
            filtered.map((order) => {
              const isActive = ACTIVE_STATUSES.includes(order.status);
              const isDelivered = order.status === OrderStatus.DELIVERED;
              const visual = order.pro ? getCategoryVisual(order.pro.category) : null;
              const itemsSummary = order.items?.map((i) => `${i.quantity}x ${i.productName}`).join(", ") ?? "";

              return (
                <Pressable
                  key={order.id}
                  onPress={() => isActive && onOpenTracking(order)}
                  className="mb-3 rounded bg-white p-4"
                  style={{
                    elevation: 1,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="h-12 w-12 items-center justify-center rounded-full"
                      style={{ backgroundColor: visual?.gradientTo ?? "#9E9E9E" }}
                    >
                      <Text style={{ fontSize: 20 }}>{visual?.emoji ?? "🏪"}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-nuit">{order.pro?.businessName ?? "Commerçant"}</Text>
                      <Text className="text-xs text-gris">
                        {new Date(order.placedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <StatusBadge status={order.status} />
                  </View>

                  <Text className="mt-3 text-[13px] text-gris">{itemsSummary}</Text>

                  <View className="mt-3 flex-row items-center justify-between border-t border-gris-light pt-3">
                    <Text className="text-sm font-bold text-nuit">{Number(order.total).toFixed(2).replace(".", ",")} €</Text>

                    {isActive ? (
                      <Pressable
                        onPress={() => onOpenTracking(order)}
                        className="flex-row items-center gap-1.5 rounded-sm bg-golfe-green px-3.5 py-2"
                      >
                        <Text style={{ fontSize: 12 }}>🧭</Text>
                        <Text className="text-xs font-bold text-white">Suivre</Text>
                      </Pressable>
                    ) : (
                      <View className="flex-row items-center gap-2">
                        {isDelivered && (
                          <Pressable
                            onPress={() => onOpenReview(order)}
                            className="flex-row items-center gap-1.5 rounded-sm bg-corail px-3.5 py-2"
                          >
                            <Text style={{ fontSize: 12 }}>⭐</Text>
                            <Text className="text-xs font-bold text-white">Avis</Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => onReorder(order)}
                          className="flex-row items-center gap-1.5 rounded-sm border-2 border-gris-light px-3.5 py-2"
                        >
                          <Text style={{ fontSize: 12 }}>🔄</Text>
                          <Text className="text-xs font-semibold text-nuit">Recommander</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {order.paymentStatus === "CAPTURED" && (
                    <View className="mt-2.5 flex-row items-center gap-2 border-t border-gris-light pt-2.5">
                      <Pressable
                        onPress={() => handleDownloadReceipt(order)}
                        disabled={!!receiptBusy[order.id]}
                        className="flex-row items-center gap-1 rounded-sm border border-gris-light px-2.5 py-1.5"
                      >
                        <Text style={{ fontSize: 11 }}>📄</Text>
                        <Text className="text-[11px] font-semibold text-nuit">
                          {receiptBusy[order.id] === "download" ? "..." : "Ticket"}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleEmailReceipt(order)}
                        disabled={!!receiptBusy[order.id]}
                        className="flex-row items-center gap-1 rounded-sm border border-gris-light px-2.5 py-1.5"
                      >
                        <Text style={{ fontSize: 11 }}>✉️</Text>
                        <Text className="text-[11px] font-semibold text-nuit">
                          {receiptBusy[order.id] === "email" ? "..." : "Par email"}
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {receiptMessage[order.id] && (
                    <Text className="mt-1.5 text-[11px] text-gris">{receiptMessage[order.id]}</Text>
                  )}

                  {order.status !== OrderStatus.CANCELLED && (
                    <Pressable
                      onPress={() => onReportIssue(order)}
                      className="mt-2.5 flex-row items-center gap-1.5 self-start border-t border-gris-light pt-2.5"
                    >
                      <Text style={{ fontSize: 11 }}>🚩</Text>
                      <Text className="text-[11px] font-semibold text-gris">
                        Signaler un problème / Faire une réclamation
                      </Text>
                    </Pressable>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full px-4 py-2"
      style={{ backgroundColor: active ? "#2ECC71" : "#F3F4F6" }}
    >
      <Text className="text-[13px] font-semibold" style={{ color: active ? "white" : "#6B7280" }}>
        {label}
      </Text>
    </Pressable>
  );
}

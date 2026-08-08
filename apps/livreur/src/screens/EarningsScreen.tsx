import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useEarningsStore } from "@/store/useEarningsStore";
import { EARNING_TYPE_LABELS, WITHDRAWAL_STATUS_LABELS } from "@/services/earningsLabels";

type Tab = "history" | "withdrawals";

function formatDateLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Aujourd'hui, ${time}`;
  if (isYesterday) return `Hier, ${time}`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export function EarningsScreen() {
  const [tab, setTab] = useState<Tab>("history");
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const { earnings, withdrawals, summary, status, load } = useEarningsStore();

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-2 pt-4">
          <Text className="font-heading text-xl font-bold text-nuit">💰 Mes gains</Text>
        </View>

        {status === "loading" && !summary ? (
          <View className="mt-10 items-center">
            <ActivityIndicator color="#2ECC71" />
          </View>
        ) : (
          <>
            {/* Balance card */}
            <View className="mx-5 mt-3 rounded p-5" style={{ backgroundColor: "#1A1A2E" }}>
              <Text className="text-[13px] text-white/70">Solde disponible</Text>
              <Text className="mt-1 font-heading text-[32px] font-extrabold text-white">
                {(summary?.availableBalance ?? 0).toFixed(2).replace(".", ",")} €
              </Text>
              {(summary?.pendingBalance ?? 0) > 0 && (
                <Text className="mt-1 text-xs text-white/50">
                  + {(summary?.pendingBalance ?? 0).toFixed(2).replace(".", ",")} € en attente
                </Text>
              )}

              <Pressable
                onPress={() => setWithdrawModalOpen(true)}
                disabled={!summary || summary.availableBalance <= 0}
                className="mt-4 items-center rounded-sm bg-golfe-green py-3"
                style={{ opacity: !summary || summary.availableBalance <= 0 ? 0.5 : 1 }}
              >
                <Text className="text-sm font-bold text-white">💸 Retirer mes gains</Text>
              </Pressable>
            </View>

            {/* Quick stats */}
            <View className="mx-5 mt-4 flex-row gap-3">
              <View className="flex-1 rounded-sm bg-gris-light p-4">
                <Text className="text-xs text-gris">Cette semaine</Text>
                <Text className="mt-1 font-heading text-lg font-bold text-nuit">
                  {(summary?.weekTotal ?? 0).toFixed(2).replace(".", ",")} €
                </Text>
              </View>
              <View className="flex-1 rounded-sm bg-gris-light p-4">
                <Text className="text-xs text-gris">Ce mois</Text>
                <Text className="mt-1 font-heading text-lg font-bold text-nuit">
                  {(summary?.monthTotal ?? 0).toFixed(2).replace(".", ",")} €
                </Text>
              </View>
            </View>

            {/* Tabs */}
            <View className="mx-5 mt-5 flex-row gap-2 rounded-sm bg-gris-light p-1">
              <TabButton label="Historique" active={tab === "history"} onPress={() => setTab("history")} />
              <TabButton label="Retraits" active={tab === "withdrawals"} onPress={() => setTab("withdrawals")} />
            </View>

            <View className="mt-4 px-5">
              {tab === "history" &&
                (earnings.length === 0 ? (
                  <EmptyState emoji="💰" label="Aucun gain pour le moment" />
                ) : (
                  earnings.map((entry) => {
                    const meta = EARNING_TYPE_LABELS[entry.type];
                    return (
                      <View key={entry.id} className="mb-2.5 flex-row items-center gap-3 rounded-sm bg-gris-light p-3.5">
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                          <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-nuit">{meta.label}</Text>
                          <Text className="text-xs text-gris">
                            {entry.orderNumber !== "—" ? `${entry.orderNumber} · ` : ""}
                            {formatDateLabel(entry.createdAt)}
                          </Text>
                        </View>
                        <Text className="text-sm font-bold text-golfe-green">
                          +{entry.amount.toFixed(2).replace(".", ",")} €
                        </Text>
                      </View>
                    );
                  })
                ))}

              {tab === "withdrawals" &&
                (withdrawals.length === 0 ? (
                  <EmptyState emoji="💸" label="Aucun retrait pour le moment" />
                ) : (
                  withdrawals.map((entry) => {
                    const meta = WITHDRAWAL_STATUS_LABELS[entry.status];
                    return (
                      <View key={entry.id} className="mb-2.5 flex-row items-center justify-between rounded-sm bg-gris-light p-3.5">
                        <View>
                          <Text className="text-sm font-semibold text-nuit">
                            {entry.amount.toFixed(2).replace(".", ",")} €
                          </Text>
                          <Text className="text-xs text-gris">{formatDateLabel(entry.createdAt)}</Text>
                        </View>
                        <Text className="text-xs font-bold" style={{ color: meta.color }}>
                          {meta.label}
                        </Text>
                      </View>
                    );
                  })
                ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={withdrawModalOpen} animationType="slide" transparent onRequestClose={() => setWithdrawModalOpen(false)}>
        <WithdrawModal onClose={() => setWithdrawModalOpen(false)} availableBalance={summary?.availableBalance ?? 0} />
      </Modal>
    </SafeAreaView>
  );
}

function EmptyState({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View className="items-center py-10">
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
      <Text className="mt-2 text-sm text-gris">{label}</Text>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center rounded-sm py-2.5"
      style={{ backgroundColor: active ? "white" : "transparent" }}
    >
      <Text className="text-[13px] font-semibold" style={{ color: active ? "#1A1A2E" : "#6B7280" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function WithdrawModal({ onClose, availableBalance }: { onClose: () => void; availableBalance: number }) {
  const [amountText, setAmountText] = useState(availableBalance > 0 ? availableBalance.toFixed(2) : "");
  const { withdraw, withdrawStatus } = useEarningsStore();

  const amount = Number(amountText.replace(",", "."));
  const isValid = amount > 0 && amount <= availableBalance;

  async function handleConfirm() {
    if (!isValid) return;
    try {
      await withdraw(amount);
      onClose();
    } catch (err) {
      Alert.alert("Retrait impossible", err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  return (
    <View className="flex-1 justify-end bg-black/40">
      <View className="rounded-t-2xl bg-white p-5 pb-10">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-heading text-lg font-bold text-nuit">💸 Retirer mes gains</Text>
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
            <Ionicons name="close" size={16} color="#1A1A2E" />
          </Pressable>
        </View>

        <View className="mb-4 rounded-sm bg-gris-light p-4">
          <Text className="text-xs text-gris">Montant disponible</Text>
          <Text className="font-heading text-2xl font-extrabold text-nuit">
            {availableBalance.toFixed(2).replace(".", ",")} €
          </Text>
        </View>

        <Text className="mb-1 text-xs font-semibold text-gris">Montant à retirer</Text>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          className="mb-3 rounded-sm border border-gris-light px-3 py-2.5 text-base text-nuit"
        />

        <Text className="mb-2 text-xs text-gris">
          Le virement sera effectué sur votre IBAN enregistré, sous 1 à 3 jours ouvrés.
        </Text>

        <Pressable
          onPress={handleConfirm}
          disabled={!isValid || withdrawStatus === "loading"}
          className="mt-3 items-center rounded-sm bg-golfe-green py-4"
          style={{ opacity: !isValid || withdrawStatus === "loading" ? 0.5 : 1 }}
        >
          {withdrawStatus === "loading" ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-bold text-white">
              Confirmer le retrait de {(isValid ? amount : 0).toFixed(2).replace(".", ",")} €
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

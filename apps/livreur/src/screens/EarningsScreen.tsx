import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  MOCK_EARNINGS_HISTORY,
  MOCK_WITHDRAWALS_HISTORY,
  EARNING_TYPE_LABELS,
  WITHDRAWAL_STATUS_LABELS,
  EARNINGS_SUMMARY,
} from "@/services/mockEarnings";

type Tab = "history" | "withdrawals";

export function EarningsScreen() {
  const [tab, setTab] = useState<Tab>("history");
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-5 pb-2 pt-4">
          <Text className="font-heading text-xl font-bold text-nuit">💰 Mes gains</Text>
        </View>

        {/* Balance card */}
        <View className="mx-5 mt-3 rounded p-5" style={{ backgroundColor: "#1A1A2E" }}>
          <Text className="text-[13px] text-white/70">Solde disponible</Text>
          <Text className="mt-1 font-heading text-[32px] font-extrabold text-white">
            {EARNINGS_SUMMARY.availableBalance.toFixed(2).replace(".", ",")} €
          </Text>
          {EARNINGS_SUMMARY.pendingBalance > 0 && (
            <Text className="mt-1 text-xs text-white/50">
              + {EARNINGS_SUMMARY.pendingBalance.toFixed(2).replace(".", ",")} € en attente
            </Text>
          )}

          <Pressable
            onPress={() => setWithdrawModalOpen(true)}
            className="mt-4 items-center rounded-sm bg-golfe-green py-3"
          >
            <Text className="text-sm font-bold text-white">💸 Retirer mes gains</Text>
          </Pressable>
        </View>

        {/* Quick stats */}
        <View className="mx-5 mt-4 flex-row gap-3">
          <View className="flex-1 rounded-sm bg-gris-light p-4">
            <Text className="text-xs text-gris">Cette semaine</Text>
            <Text className="mt-1 font-heading text-lg font-bold text-nuit">
              {EARNINGS_SUMMARY.weekTotal.toFixed(2).replace(".", ",")} €
            </Text>
          </View>
          <View className="flex-1 rounded-sm bg-gris-light p-4">
            <Text className="text-xs text-gris">Ce mois</Text>
            <Text className="mt-1 font-heading text-lg font-bold text-nuit">
              {EARNINGS_SUMMARY.monthTotal.toFixed(2).replace(".", ",")} €
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="mx-5 mt-5 flex-row gap-2 rounded-sm bg-gris-light p-1">
          <TabButton label="Historique" active={tab === "history"} onPress={() => setTab("history")} />
          <TabButton label="Retraits" active={tab === "withdrawals"} onPress={() => setTab("withdrawals")} />
        </View>

        <View className="mt-4 px-5">
          {tab === "history"
            ? MOCK_EARNINGS_HISTORY.map((entry) => {
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
                        {entry.dateLabel}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-golfe-green">
                      +{entry.amount.toFixed(2).replace(".", ",")} €
                    </Text>
                  </View>
                );
              })
            : MOCK_WITHDRAWALS_HISTORY.map((entry) => {
                const meta = WITHDRAWAL_STATUS_LABELS[entry.status];
                return (
                  <View key={entry.id} className="mb-2.5 flex-row items-center justify-between rounded-sm bg-gris-light p-3.5">
                    <View>
                      <Text className="text-sm font-semibold text-nuit">
                        {entry.amount.toFixed(2).replace(".", ",")} €
                      </Text>
                      <Text className="text-xs text-gris">{entry.dateLabel}</Text>
                    </View>
                    <Text className="text-xs font-bold" style={{ color: meta.color }}>
                      {meta.label}
                    </Text>
                  </View>
                );
              })}

          {tab === "withdrawals" && MOCK_WITHDRAWALS_HISTORY.length === 0 && (
            <View className="items-center py-10">
              <Text style={{ fontSize: 36 }}>💸</Text>
              <Text className="mt-2 text-sm text-gris">Aucun retrait pour le moment</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={withdrawModalOpen} animationType="slide" transparent onRequestClose={() => setWithdrawModalOpen(false)}>
        <WithdrawModal onClose={() => setWithdrawModalOpen(false)} availableBalance={EARNINGS_SUMMARY.availableBalance} />
      </Modal>
    </SafeAreaView>
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

        <Text className="mb-2 text-xs text-gris">
          Le virement sera effectué sur votre IBAN enregistré, sous 1 à 3 jours ouvrés.
        </Text>

        <Pressable onPress={onClose} className="mt-3 items-center rounded-sm bg-golfe-green py-4">
          <Text className="text-base font-bold text-white">
            Confirmer le retrait de {availableBalance.toFixed(2).replace(".", ",")} €
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

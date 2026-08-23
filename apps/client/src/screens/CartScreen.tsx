import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCartStore } from "@/store/useCartStore";
import { useAddressStore } from "@/store/useAddressStore";
import { createOrder, createPaymentIntent, cancelOrder } from "@/services/ordersApi";
import { ApiRequestError } from "@/services/apiClient";
import type { CheckoutPayment as CheckoutPaymentComponent } from "@/components/CheckoutPayment";
import { haversineDistanceKm } from "@/services/categoryVisuals";
import {
  fetchPricingConfig,
  computeDeliveryFeeForDistance,
  computeEffectiveDeliveryFee,
  minPossibleDeliveryFee,
  DEFAULT_PRICING_CONFIG,
  type PricingConfig,
} from "@/services/prosApi";
import type { Order } from "@golfeexpress/types";

interface CartScreenProps {
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
  /** Ouvre le sélecteur d'adresse par-dessus le panier (22/08/2026) — sans
   * ça, un client sans adresse encore choisie ne pouvait le découvrir
   * qu'après avoir tenté de commander, et le tarif de livraison affiché
   * restait un montant fixe qui n'avait jamais tenu compte de sa distance
   * réelle jusqu'au commerçant. */
  onOpenAddressPicker: () => void;
}

// Frais de service — pas encore piloté depuis Admin > Tarification (voir
// apps/api/src/app/api/orders/route.ts, même constante côté serveur).
// Contrairement aux frais de livraison, il n'existe pour l'instant aucune
// grille par distance pour ce montant : il reste fixe quelle que soit
// l'adresse du client, c'est le comportement voulu actuellement.
const SERVICE_FEE = 0.99;

export function CartScreen({ onClose, onOrderCreated, onOpenAddressPicker }: CartScreenProps) {
  const items = useCartStore((s) => s.items);
  const proId = useCartStore((s) => s.proId);
  const pickupAddressId = useCartStore((s) => s.pickupAddressId);
  const pickupLat = useCartStore((s) => s.pickupLat);
  const pickupLng = useCartStore((s) => s.pickupLng);
  const subtotal = useCartStore((s) => s.subtotal());
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clear);

  const activeAddress = useAddressStore((s) => s.activeAddress);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);

  // Étape de paiement carte — dès que non-null, remplace le contenu du
  // panier par le formulaire Stripe (voir rendu plus bas). order.id sert au
  // client_secret déjà récupéré ET à l'éventuelle annulation.
  const [pendingPayment, setPendingPayment] = useState<{ order: Order; clientSecret: string } | null>(null);
  // Chargé dynamiquement, web uniquement (voir CheckoutPayment.tsx) — reste
  // `null` sur natif, auquel cas le rendu plus bas affiche un message
  // explicite plutôt que de faire comme si le paiement carte était possible.
  const [CheckoutPayment, setCheckoutPayment] = useState<typeof CheckoutPaymentComponent | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      import("@/components/CheckoutPayment").then((mod) => setCheckoutPayment(() => mod.CheckoutPayment));
    }
  }, []);

  // Charge le vrai tarif de livraison configuré depuis Admin > Tarification
  // (montant fixe, ou grille par distance si activée) — une fois à
  // l'ouverture du panier, comme pour les fiches commerçant (prosApi.ts).
  useEffect(() => {
    fetchPricingConfig().then(setPricingConfig);
  }, []);

  // Distance réelle entre le commerçant et l'adresse de livraison
  // ACTUELLEMENT choisie par le client — recalculée à chaque changement
  // d'adresse (pas figée au moment de l'ajout au panier), avec les mêmes
  // coordonnées que celles que POST /api/orders utilisera pour calculer le
  // tarif réellement facturé (fromAddress/toAddress -> haversineDistanceKm).
  const distanceKm =
    pickupLat !== null && pickupLng !== null && activeAddress
      ? haversineDistanceKm(pickupLat, pickupLng, activeAddress.lat, activeAddress.lng)
      : null;

  // Tant qu'aucune adresse n'est choisie, on ne peut pas connaître la
  // distance réelle : on affiche le tarif de base (ou le premier palier) à
  // titre indicatif, mais clairement marqué "à partir de" plutôt que comme
  // un montant définitif — corrige un bug où l'ancien tarif fixe (2,90 €,
  // périmé) s'affichait comme si c'était le montant exact, quelle que soit
  // l'adresse du client.
  // Tarif "de base" par distance (ou fixe), avant application éventuelle de
  // la livraison gratuite au-dessus d'un panier minimum.
  // Tant que l'adresse n'est pas connue, on affiche le plancher garanti
  // (palier le moins cher, voir minPossibleDeliveryFee) plutôt que le
  // premier palier de la liste — qui n'est pas forcément le moins cher si la
  // grille n'est pas triée par tarif croissant (22/08/2026, même correctif
  // que ProCard.tsx).
  const baseDeliveryFee =
    distanceKm !== null ? computeDeliveryFeeForDistance(distanceKm, pricingConfig) : minPossibleDeliveryFee(pricingConfig);

  // Livraison gratuite au-dessus d'un panier (22/08/2026, désactivé par
  // défaut) — ne dépend PAS de la distance, donc peut déjà s'appliquer même
  // avant que le client ait choisi une adresse (contrairement au tarif par
  // distance, qui lui reste une estimation tant que l'adresse n'est pas
  // connue). Voir computeEffectiveDeliveryFee (prosApi.ts), même logique que
  // POST /api/orders côté serveur (getEffectiveDeliveryFee).
  const freeDeliveryActive =
    pricingConfig.freeDeliveryThresholdEnabled && subtotal >= pricingConfig.freeDeliveryThresholdAmount;

  const deliveryFee =
    distanceKm !== null
      ? computeEffectiveDeliveryFee(distanceKm, subtotal, pricingConfig)
      : freeDeliveryActive
        ? 0
        : baseDeliveryFee;
  const deliveryFeeIsEstimate = distanceKm === null && !freeDeliveryActive;

  const total = subtotal + deliveryFee + SERVICE_FEE;

  async function handleCheckout() {
    setError(null);

    if (!proId || !pickupAddressId) {
      setError("Panier invalide — réessayez d'ajouter vos articles.");
      return;
    }
    if (!activeAddress) {
      // Ouvre directement le sélecteur d'adresse plutôt que de se contenter
      // d'un message d'erreur — le client n'a plus besoin de chercher
      // comment changer d'adresse ailleurs dans l'app.
      onOpenAddressPicker();
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        proId,
        fromAddressId: pickupAddressId,
        toAddressId: activeAddress.id,
        items,
      });

      // La commande existe déjà en base à ce stade (statut PENDING, non
      // payée) — on ne l'efface pas si le paiement échoue ou est annulé,
      // voir handlePaymentCancel juste en dessous, qui l'annule
      // explicitement plutôt que de la laisser orpheline.
      const clientSecret = await createPaymentIntent(order.id);
      setPendingPayment({ order, clientSecret });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Impossible de créer la commande.");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePaymentSuccess() {
    if (!pendingPayment) return;
    const order = pendingPayment.order;
    setPendingPayment(null);
    clearCart();
    onOrderCreated(order);
  }

  async function handlePaymentCancel() {
    if (!pendingPayment) return;
    try {
      await cancelOrder(pendingPayment.order.id);
    } catch {
      // Best-effort : même si l'annulation échoue côté serveur (ex: la
      // commande a entre-temps été acceptée par le Pro), on laisse quand
      // même le client revenir à son panier plutôt que de le bloquer sur
      // une erreur — la commande impayée reste visible et gérable depuis
      // l'écran Commandes / par l'admin le cas échéant.
    } finally {
      setPendingPayment(null);
    }
  }

  if (pendingPayment) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="flex-1 px-5 pt-5">
          {/* Logo Do You Geckoo à côté du titre, l'ensemble centré -- le
              spacer de gauche compense la largeur du bouton fermer à droite
              pour que le groupe logo+titre reste visuellement centré plutôt
              que décalé (22/08/2026, même largeur que le bouton ✕). */}
          <View className="mb-5 flex-row items-center justify-between">
            <View style={{ width: 36 }} />
            <View className="flex-1 flex-row items-center justify-center gap-2">
              <Image
                source={require("../../assets/wordmark-logo.png")}
                style={{ height: 22, width: 62 }}
                resizeMode="contain"
              />
              <Text className="font-heading text-xl font-bold text-nuit">Paiement</Text>
            </View>
            <Pressable
              onPress={handlePaymentCancel}
              className="h-9 w-9 items-center justify-center rounded-full bg-gris-light"
            >
              <Text style={{ fontSize: 14, color: "#1A1A2E" }}>✕</Text>
            </Pressable>
          </View>

          {Platform.OS !== "web" ? (
            <View className="items-center py-16">
              <Text style={{ fontSize: 40 }}>💳</Text>
              <Text className="mt-3 text-center text-gris">
                Le paiement par carte n'est disponible que sur la version web de Do You Geckoo pour le moment.
              </Text>
              <Pressable
                onPress={handlePaymentCancel}
                className="mt-5 rounded bg-gris-light px-5 py-3"
              >
                <Text className="text-sm font-semibold text-nuit">Retour au panier</Text>
              </Pressable>
            </View>
          ) : !CheckoutPayment ? (
            <View className="items-center py-16">
              <ActivityIndicator color="#2ECC71" />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <CheckoutPayment
                clientSecret={pendingPayment.clientSecret}
                amount={total}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="flex-1 px-5 pt-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Text className="font-heading text-xl font-bold text-nuit">🛒 Votre panier</Text>
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-gris-light">
            <Text style={{ fontSize: 14, color: "#1A1A2E" }}>✕</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {items.length === 0 ? (
            <View className="items-center py-16">
              <Text style={{ fontSize: 48 }}>🛒</Text>
              <Text className="mt-3 text-gris">Votre panier est vide</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} className="flex-row gap-3 border-b border-gris-light py-3.5">
                <View className="h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-sm bg-gris-light">
                  {item.emoji.startsWith("http") ? (
                    <Image source={{ uri: item.emoji }} style={{ width: 60, height: 60 }} resizeMode="cover" />
                  ) : (
                    <Text style={{ fontSize: 26 }}>{item.emoji}</Text>
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-start justify-between">
                    <Text className="flex-1 text-sm font-semibold text-nuit">{item.name}</Text>
                    <Pressable onPress={() => removeItem(item.id)} className="ml-2 p-1">
                      <Text style={{ fontSize: 14 }}>🗑️</Text>
                    </Pressable>
                  </View>
                  {item.optionsLabel ? (
                    <Text className="mt-0.5 text-xs text-gris">{item.optionsLabel}</Text>
                  ) : null}
                  <Text className="mt-1 font-bold text-golfe-green">
                    {item.unitPrice.toFixed(2).replace(".", ",")} €
                  </Text>
                </View>
                <View className="flex-row items-center gap-2.5">
                  <Pressable
                    onPress={() => (item.quantity === 1 ? removeItem(item.id) : updateQuantity(item.id, -1))}
                    className="h-7 w-7 items-center justify-center rounded-full border-2 border-gris-light"
                  >
                    <Text className="font-bold text-nuit">−</Text>
                  </Pressable>
                  <Text className="font-bold text-nuit">{item.quantity}</Text>
                  <Pressable
                    onPress={() => updateQuantity(item.id, 1)}
                    className="h-7 w-7 items-center justify-center rounded-full border-2 border-gris-light"
                  >
                    <Text className="font-bold text-nuit">+</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {items.length > 0 && (
          <View className="border-t-2 border-gris-light pb-6 pt-5">
            {error && (
              <View className="mb-3 rounded-sm bg-red-50 p-3">
                <Text className="text-[13px] text-red-500">{error}</Text>
              </View>
            )}

            {/* Tant qu'aucune adresse n'est choisie, les frais de livraison
                affichés ci-dessous ne sont qu'une estimation — ce bandeau le
                rend explicite et permet de choisir l'adresse sans quitter le
                panier (22/08/2026). */}
            <Pressable
              onPress={onOpenAddressPicker}
              className="mb-3.5 flex-row items-center gap-2.5 rounded-sm bg-gris-light px-3.5 py-3"
            >
              <Text style={{ fontSize: 15 }}>📍</Text>
              <View className="flex-1">
                <Text className="text-[11px] text-gris">Livraison à</Text>
                <Text className="text-[13px] font-semibold text-nuit" numberOfLines={1}>
                  {activeAddress ? `${activeAddress.street}, ${activeAddress.city}` : "Choisir une adresse de livraison"}
                </Text>
              </View>
              <Text className="text-xs font-semibold text-golfe-green">
                {activeAddress ? "Changer" : "Choisir"}
              </Text>
            </Pressable>

            {/* Nudge marketing (22/08/2026) : le but de la livraison
                gratuite au-dessus d'un panier est justement d'inciter à
                ajouter des articles — sans ce message, le client n'a aucun
                moyen de savoir qu'il en est proche. */}
            {pricingConfig.freeDeliveryThresholdEnabled && !freeDeliveryActive && (
              <Text className="mb-2.5 text-[12px] text-golfe-green">
                Plus que{" "}
                {(pricingConfig.freeDeliveryThresholdAmount - subtotal).toFixed(2).replace(".", ",")} € pour la
                livraison offerte !
              </Text>
            )}
            {freeDeliveryActive && (
              <Text className="mb-2.5 text-[12px] font-semibold text-golfe-green">🎉 Livraison offerte !</Text>
            )}

            <SummaryRow label="Sous-total" value={subtotal} />
            <SummaryRow
              label={deliveryFeeIsEstimate ? "Livraison (à partir de)" : "Livraison"}
              value={deliveryFee}
              valueColor="#2ECC71"
              strikeValue={freeDeliveryActive ? baseDeliveryFee : undefined}
            />
            <SummaryRow label="Service Do You Geckoo" value={SERVICE_FEE} />
            <View className="mt-2 flex-row justify-between border-t border-gris-light pt-3">
              <Text className="font-heading text-lg font-bold text-nuit">
                {deliveryFeeIsEstimate ? "Total estimé" : "Total"}
              </Text>
              <Text className="font-heading text-lg font-bold text-nuit">
                {total.toFixed(2).replace(".", ",")} €
              </Text>
            </View>

            <Pressable
              onPress={handleCheckout}
              disabled={submitting}
              className="mt-4 items-center rounded bg-golfe-green py-4"
              style={{ opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : activeAddress ? (
                <Text className="text-base font-bold text-white">
                  Payer · {total.toFixed(2).replace(".", ",")} €
                </Text>
              ) : (
                <Text className="text-base font-bold text-white">Choisir une adresse pour commander</Text>
              )}
            </Pressable>
            <Text className="mt-2 text-center text-[11px] text-gris">
              Paiement sécurisé par carte bancaire, via Stripe.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
  strikeValue,
}: {
  label: string;
  value: number;
  valueColor?: string;
  /** Ancien tarif barré à côté du nouveau (22/08/2026) — utilisé quand la
   * livraison gratuite au-dessus d'un panier vient d'annuler le tarif par
   * distance, pour que le client comprenne visuellement l'économie réalisée
   * plutôt que de simplement voir "0,00 €" sans contexte. */
  strikeValue?: number;
}) {
  return (
    <View className="mb-2.5 flex-row justify-between">
      <Text className="text-sm text-gris">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        {strikeValue !== undefined && (
          <Text className="text-xs text-gris line-through">{strikeValue.toFixed(2).replace(".", ",")} €</Text>
        )}
        <Text className="text-sm" style={{ color: valueColor ?? "#1A1A2E" }}>
          {value.toFixed(2).replace(".", ",")} €
        </Text>
      </View>
    </View>
  );
}

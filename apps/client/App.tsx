import "./global.css";
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { Order } from "@golfeexpress/types";

import { useAuthStore } from "@/store/useAuthStore";
import { getCachedBrandingSplashUrl, fetchBrandingSplashUrl } from "@/services/brandingApi";
import { SplashLoader } from "@/components/SplashLoader";
import { AuthScreen } from "@/screens/AuthScreen";
import { ResetPasswordScreen } from "@/screens/ResetPasswordScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { ProDetailScreen } from "@/screens/ProDetailScreen";
import { CartScreen } from "@/screens/CartScreen";
import { TrackingScreen } from "@/screens/TrackingScreen";
import { AddressPickerScreen } from "@/screens/AddressPickerScreen";
import { MapScreen } from "@/screens/MapScreen";
import { OrdersScreen } from "@/screens/OrdersScreen";
import { FidelityScreen } from "@/screens/FidelityScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { ReviewScreen } from "@/screens/ReviewScreen";
import { ReportIssueScreen } from "@/screens/ReportIssueScreen";
import type { ProWithUi } from "@/services/prosApi";
import { fetchPros } from "@/services/prosApi";
import { fetchMyOrders } from "@/services/ordersApi";
import { useCartStore } from "@/store/useCartStore";

type Tab = "home" | "orders" | "fidelity" | "profile";

// Emojis plutôt qu'Ionicons : sur l'export web, la police d'icônes Ionicons
// (fichier .ttf) n'est pas toujours servie correctement une fois déployée
// (404 constaté), ce qui affichait des carrés vides à la place des icônes.
// Les emojis s'appuient sur la police système du téléphone/navigateur, donc
// aucun fichier externe à charger — zéro risque de ce type.
const TABS: { key: Tab; emoji: string; label: string }[] = [
  { key: "home", emoji: "🏠", label: "Accueil" },
  { key: "orders", emoji: "🧾", label: "Commandes" },
  { key: "fidelity", emoji: "🎁", label: "Fidélité" },
  { key: "profile", emoji: "👤", label: "Profil" },
];

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  // Modals plein écran (empilés au-dessus des tabs)
  const [selectedPro, setSelectedPro] = useState<ProWithUi | null>(null);
  const [deepLinkProductId, setDeepLinkProductId] = useState<string | undefined>(undefined);
  const [cartOpen, setCartOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reportOrder, setReportOrder] = useState<Order | null>(null);

  const logout = useAuthStore((s) => s.logout);
  const clearCart = useCartStore((s) => s.clear);
  const cartItemCount = useCartStore((s) => s.itemCount());

  // Deep-link depuis le site vitrine (doyougeckoo.fr) : un clic sur
  // "Commander chez X" ou sur un produit précis ajoute ?pro=<id>[&product=<id>]
  // à l'URL — on ouvre alors directement la bonne fiche commerçant (et le
  // bon produit) au lieu de laisser l'utilisateur atterrir sur l'accueil
  // générique et devoir tout rechercher une seconde fois.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const proId = params.get("pro");
    if (!proId) return;

    const productId = params.get("product") ?? undefined;

    // On nettoie l'URL tout de suite (avant même la réponse réseau) pour
    // ne pas rouvrir la même fiche si l'utilisateur navigue ensuite dans
    // l'app et que ce composant se re-rend.
    window.history.replaceState({}, "", window.location.pathname);

    fetchPros()
      .then((pros) => {
        const match = pros.find((p) => p.id === proId);
        if (match) {
          setSelectedPro(match);
          setDeepLinkProductId(productId);
        }
      })
      .catch(() => {
        /* lien invalide/expiré : on laisse simplement l'utilisateur sur l'accueil */
      });
  }, []);

  // Deep-link depuis le mail "Commande livrée" : ?screen=review&orderId=<id>
  // ouvre directement l'écran de notation de cette commande, sans passer
  // par l'onglet Commandes (voir sendOrderDeliveredEmail côté API).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("screen") !== "review") return;
    const orderId = params.get("orderId");
    if (!orderId) return;

    window.history.replaceState({}, "", window.location.pathname);

    fetchMyOrders()
      .then((orders) => {
        const match = orders.find((o) => o.id === orderId);
        if (match) setReviewOrder(match);
      })
      .catch(() => {
        /* lien invalide/expiré : on laisse simplement l'utilisateur sur l'accueil */
      });
  }, []);

  function handleOrderCreated(order: Order) {
    setCartOpen(false);
    setTrackingOrder(order);
  }

  function handleReorder(order: Order) {
    // Recommander revient à rouvrir le Pro concerné pour reconstituer un
    // panier à jour (prix/dispo actuels) plutôt que de rejouer aveuglément
    // les anciens items, qui pourraient ne plus exister ou avoir changé de prix.
    if (order.pro) {
      setActiveTab("home");
      // setSelectedPro nécessite un ProWithUi complet (emoji, distance...) ;
      // ce que renvoie /api/orders est partiel. On ouvre donc Home et laisse
      // l'utilisateur retrouver le Pro — limitation actuelle, à améliorer en
      // enrichissant cette navigation une fois GET /api/pros/[proId] dispo
      // pour un seul Pro (actuellement uniquement la liste complète).
    }
  }

  function renderTabContent() {
    switch (activeTab) {
      case "home":
        return (
          <HomeScreen
            onOpenPro={(pro) => {
              setDeepLinkProductId(undefined);
              setSelectedPro(pro);
            }}
            onOpenCart={() => setCartOpen(true)}
            onOpenAddressPicker={() => setAddressPickerOpen(true)}
            onOpenMap={() => setMapOpen(true)}
          />
        );
      case "orders":
        return (
          <OrdersScreen
            onOpenTracking={setTrackingOrder}
            onReorder={handleReorder}
            onOpenReview={setReviewOrder}
            onReportIssue={setReportOrder}
          />
        );
      case "fidelity":
        return <FidelityScreen />;
      case "profile":
        return (
          <ProfileScreen
            onLogout={async () => {
              clearCart();
              await logout();
            }}
          />
        );
    }
  }

  return (
    <View className="flex-1 bg-white">
      {renderTabContent()}

      {/* BOTTOM NAV */}
      <SafeAreaView edges={["bottom"]} className="border-t border-gris-light bg-white">
        <View className="flex-row justify-around py-3">
          {/* Accueil en premier */}
          {(() => {
            const tab = TABS[0];
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="items-center gap-1 rounded-xl px-3 py-1"
                style={{ backgroundColor: isActive ? "rgba(46,204,113,0.08)" : "transparent" }}
              >
                <Text style={{ fontSize: 20 }}>{tab.emoji}</Text>
                <Text className="text-[11px]" style={{ color: isActive ? "#2ECC71" : "#6B7280" }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })()}

          {/* Panier — n'est pas un onglet de contenu (comme les autres), il ouvre
              la modal panier déjà câblée via cartOpen/setCartOpen. Affiché en
              permanence dans le footer (contrairement à FloatingCart, qui ne
              vit que sur l'écran Accueil et disparaît dès qu'on en sort). */}
          <Pressable
            onPress={() => setCartOpen(true)}
            className="items-center gap-1 rounded-xl px-3 py-1"
            style={{ backgroundColor: cartOpen ? "rgba(46,204,113,0.08)" : "transparent" }}
          >
            <View>
              <Text style={{ fontSize: 20 }}>🛒</Text>
              {cartItemCount > 0 && (
                <View
                  className="absolute items-center justify-center rounded-full bg-corail"
                  style={{ height: 16, width: 16, right: -8, top: -4 }}
                >
                  <Text style={{ fontSize: 9, fontWeight: "bold", color: "white" }}>{cartItemCount}</Text>
                </View>
              )}
            </View>
            <Text className="text-[11px]" style={{ color: cartOpen ? "#2ECC71" : "#6B7280" }}>
              Panier
            </Text>
          </Pressable>

          {/* Reste des onglets (Commandes, Fidélité, Profil) */}
          {TABS.slice(1).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className="items-center gap-1 rounded-xl px-3 py-1"
                style={{ backgroundColor: isActive ? "rgba(46,204,113,0.08)" : "transparent" }}
              >
                <Text style={{ fontSize: 20 }}>{tab.emoji}</Text>
                <Text className="text-[11px]" style={{ color: isActive ? "#2ECC71" : "#6B7280" }}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>

      {/* MODAL: Détail Pro */}
      <Modal
        visible={!!selectedPro}
        animationType="slide"
        onRequestClose={() => {
          setSelectedPro(null);
          setDeepLinkProductId(undefined);
        }}
      >
        {selectedPro && (
          <ProDetailScreen
            pro={selectedPro}
            initialProductId={deepLinkProductId}
            onClose={() => {
              setSelectedPro(null);
              setDeepLinkProductId(undefined);
            }}
          />
        )}
      </Modal>

      {/* MODAL: Panier */}
      <Modal visible={cartOpen} animationType="slide" onRequestClose={() => setCartOpen(false)}>
        <CartScreen onClose={() => setCartOpen(false)} onOrderCreated={handleOrderCreated} />
      </Modal>

      {/* MODAL: Suivi de commande */}
      <Modal visible={!!trackingOrder} animationType="slide" onRequestClose={() => setTrackingOrder(null)}>
        {trackingOrder && <TrackingScreen order={trackingOrder} onClose={() => setTrackingOrder(null)} />}
      </Modal>

      {/* MODAL: Notation post-livraison */}
      <Modal visible={!!reviewOrder} animationType="slide" onRequestClose={() => setReviewOrder(null)}>
        {reviewOrder && <ReviewScreen order={reviewOrder} onClose={() => setReviewOrder(null)} />}
      </Modal>

      {/* MODAL: Réclamation / signalement de problème */}
      <Modal visible={!!reportOrder} animationType="slide" onRequestClose={() => setReportOrder(null)}>
        {reportOrder && <ReportIssueScreen order={reportOrder} onClose={() => setReportOrder(null)} />}
      </Modal>

      {/* MODAL: Sélection d'adresse */}
      <Modal visible={addressPickerOpen} animationType="slide" onRequestClose={() => setAddressPickerOpen(false)}>
        <AddressPickerScreen
          onClose={() => setAddressPickerOpen(false)}
          onSelected={() => setAddressPickerOpen(false)}
        />
      </Modal>

      {/* MODAL: Carte interactive */}
      <Modal visible={mapOpen} animationType="slide" onRequestClose={() => setMapOpen(false)}>
        <MapScreen
          onClose={() => setMapOpen(false)}
          onOpenPro={(pro) => {
            setMapOpen(false);
            setDeepLinkProductId(undefined);
            setSelectedPro(pro);
          }}
        />
      </Modal>
    </View>
  );
}

export default function App() {
  const status = useAuthStore((s) => s.status);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Écran de chargement animé affiché tant que `showSplash` est vrai —
  // reste affiché un court instant même après que `status` ait basculé
  // (voir SplashLoader.tsx : la barre doit visuellement atteindre 100%
  // avant de céder la place au vrai contenu, sinon l'animation serait
  // coupée net et la fausse progression n'aurait servi à rien).
  const [showSplash, setShowSplash] = useState(true);

  // Image du badge/mascotte de l'écran de chargement, réglable en direct
  // depuis Admin > Branding — le cache local (AsyncStorage) est async donc
  // pas dispo dès le tout premier rendu, d'où le `null` initial (repli
  // automatique sur la mascotte statique du build, voir SplashLoader.tsx).
  const [splashUrl, setSplashUrl] = useState<string | null>(null);

  // Arrivée depuis le lien "mot de passe oublié" reçu par email
  // (?reset_token=...) — voir apps/pro/src/App.tsx pour le détail du
  // raisonnement (identique ici).
  const [resetToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("reset_token");
  });

  useEffect(() => {
    restoreSession();
    getCachedBrandingSplashUrl().then((cached) => {
      if (cached) setSplashUrl(cached);
    });
    fetchBrandingSplashUrl().then(setSplashUrl);
  }, []);

  if (resetToken) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <ResetPasswordScreen
          token={resetToken}
          onDone={() => {
            window.history.replaceState({}, "", window.location.pathname);
            window.location.reload();
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {showSplash ? (
        <SplashLoader
          ready={status !== "idle" && status !== "loading"}
          onFinished={() => setShowSplash(false)}
          imageUrl={splashUrl}
        />
      ) : status === "authenticated" ? (
        <MainApp />
      ) : (
        <AuthScreen />
      )}
    </SafeAreaProvider>
  );
}

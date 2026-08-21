import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SplashLoader } from "@/components/SplashLoader";
import { DashboardPage } from "@/pages/DashboardPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { MenuPage } from "@/pages/MenuPage";
import { FinancesPage } from "@/pages/FinancesPage";
import { SubscriptionPage } from "@/pages/SubscriptionPage";
import { ReviewsPage } from "@/pages/ReviewsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { LoginPage } from "@/pages/LoginPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { useAuthStore } from "@/store/useAuthStore";
import { useProOrdersStore } from "@/store/useProOrdersStore";
import { useNewOrderNotifications } from "@/hooks/useNewOrderNotifications";
import { getCachedBrandingSplashUrl, fetchBrandingSplashUrl } from "@/services/brandingApi";

function MainApp() {
  const [activePage, setActivePage] = useState("dashboard");
  const loadOrders = useProOrdersStore((s) => s.loadOrders);

  // Rafraîchit les commandes en continu au niveau racine (pas seulement
  // dans OrdersPage) pour que la détection de nouvelles commandes — et donc
  // le son de notification — fonctionne même quand le Pro consulte une
  // autre page (Menu, Finances...).
  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  useNewOrderNotifications();

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage onViewAllOrders={() => setActivePage("orders")} />;
      case "orders":
        return <OrdersPage />;
      case "menu":
        return <MenuPage />;
      case "finances":
        return <FinancesPage />;
      case "subscription":
        return <SubscriptionPage />;
      case "reviews":
        return <ReviewsPage />;
      case "notifications":
        return <NotificationsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage onViewAllOrders={() => setActivePage("orders")} />;
    }
  }

  return (
    <div className="flex min-h-screen bg-gris-light/30">
      <Sidebar activeItem={activePage} onSelect={setActivePage} />
      <main className="flex-1">{renderPage()}</main>
    </div>
  );
}

export default function App() {
  const status = useAuthStore((s) => s.status);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Arrivée depuis le lien "mot de passe oublié" reçu par email
  // (?reset_token=...) — prioritaire sur tout le reste, quel que soit le
  // statut de connexion courant. Pas de vrai router dans cette app (state
  // switch simple), donc on lit directement l'URL au montage.
  const [resetToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("reset_token");
  });

  // Écran de chargement animé affiché tant que `showSplash` est vrai — voir
  // apps/client/App.tsx pour le détail du raisonnement (identique ici).
  const [showSplash, setShowSplash] = useState(true);

  // Image du badge/mascotte de l'écran de chargement, réglable en direct
  // depuis Admin > Branding — lue en cache localStorage au tout premier
  // rendu (instantané, pas de flash), puis rafraîchie en tâche de fond.
  const [splashUrl, setSplashUrl] = useState<string | null>(() => getCachedBrandingSplashUrl());

  useEffect(() => {
    restoreSession();
    fetchBrandingSplashUrl().then(setSplashUrl);
  }, []);

  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onDone={() => {
          window.history.replaceState({}, "", window.location.pathname);
          window.location.reload();
        }}
      />
    );
  }

  if (showSplash) {
    return (
      <SplashLoader
        ready={status !== "idle" && status !== "loading"}
        onFinished={() => setShowSplash(false)}
        imageUrl={splashUrl}
      />
    );
  }

  if (status === "authenticated") {
    return <MainApp />;
  }

  return <LoginPage />;
}

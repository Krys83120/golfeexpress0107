import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DashboardPage } from "@/pages/DashboardPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { MenuPage } from "@/pages/MenuPage";
import { FinancesPage } from "@/pages/FinancesPage";
import { ReviewsPage } from "@/pages/ReviewsPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { LoginPage } from "@/pages/LoginPage";
import { useAuthStore } from "@/store/useAuthStore";
import { useProOrdersStore } from "@/store/useProOrdersStore";
import { useNewOrderNotifications } from "@/hooks/useNewOrderNotifications";

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

  useEffect(() => {
    restoreSession();
  }, []);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gris-light/30">
        <p className="text-sm text-gris">Chargement...</p>
      </div>
    );
  }

  if (status === "authenticated") {
    return <MainApp />;
  }

  return <LoginPage />;
}

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
import { EmployeesPage } from "@/pages/EmployeesPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { LoginPage } from "@/pages/LoginPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { useAuthStore } from "@/store/useAuthStore";
import { useProOrdersStore } from "@/store/useProOrdersStore";
import { useNewOrderNotifications } from "@/hooks/useNewOrderNotifications";
import { useScreenWakeLock } from "@/hooks/useScreenWakeLock";
import {
  getCachedBrandingSplashUrl,
  fetchBrandingSplashUrl,
  getCachedBrandingSplashRunnerUrl,
  fetchBrandingSplashRunnerUrl,
} from "@/services/brandingApi";
import { trackAppOpen } from "@/services/analyticsApi";

// Pages autorisées pour un compte employé (role PRO_EMPLOYEE) -- voir le
// commentaire équivalent dans components/Sidebar.tsx (EMPLOYEE_NAV_KEYS).
// La Sidebar ne propose déjà que ces entrées, mais on regarde-double ici
// (activePage initial + renderPage) au cas où activePage serait resté sur
// une page interdite d'un précédent état (ex: bascule de compte sans
// rechargement complet de la page).
const EMPLOYEE_ALLOWED_PAGES = new Set(["orders", "notifications"]);

function MainApp() {
  const isEmployee = useAuthStore((s) => s.isEmployee);
  const [activePage, setActivePage] = useState(() => (isEmployee ? "orders" : "dashboard"));
  const loadOrders = useProOrdersStore((s) => s.loadOrders);

  // Si le flag isEmployee arrive après le premier rendu (résolu de manière
  // asynchrone par fetchAndSetProfile) et que la page active n'est pas
  // autorisée pour un employé, on rebascule sur Commandes.
  useEffect(() => {
    if (isEmployee && !EMPLOYEE_ALLOWED_PAGES.has(activePage)) {
      setActivePage("orders");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee]);

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
  // Empêche l'écran de se mettre en veille tant qu'un Pro ou un employé est
  // connecté -- sinon le polling ci-dessus est suspendu par le navigateur
  // et plus aucune commande n'est détectée (voir useScreenWakeLock.ts).
  useScreenWakeLock();

  function renderPage() {
    // Un employé ne doit jamais pouvoir afficher une page sensible, quel
    // que soit comment activePage y arriverait (état résiduel, etc.) -- voir
    // EMPLOYEE_ALLOWED_PAGES ci-dessus. On ne fait confiance qu'à cette
    // liste, pas au switch ci-dessous.
    const page = isEmployee && !EMPLOYEE_ALLOWED_PAGES.has(activePage) ? "orders" : activePage;

    switch (page) {
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
      case "employees":
        return <EmployeesPage />;
      default:
        return isEmployee ? <OrdersPage /> : <DashboardPage onViewAllOrders={() => setActivePage("orders")} />;
    }
  }

  return (
    <div className="flex min-h-screen bg-gris-light/30">
      <Sidebar activeItem={activePage} onSelect={setActivePage} />
      {/* pt-16 sur mobile/tablette : laisse la place au bouton hamburger fixe
          de la Sidebar (voir Sidebar.tsx) -- inutile à partir de lg, où la
          Sidebar reste statique et n'a pas de bouton hamburger. */}
      <main className="min-w-0 flex-1 pt-16 lg:pt-0">{renderPage()}</main>
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

  // Image du badge et de la mascotte "traversée d'écran" de l'écran de
  // chargement, réglables indépendamment en direct depuis Admin > Branding
  // — lues en cache localStorage au tout premier rendu (instantané, pas de
  // flash), puis rafraîchies en tâche de fond.
  const [splashUrl, setSplashUrl] = useState<string | null>(() => getCachedBrandingSplashUrl());
  const [splashRunnerUrl, setSplashRunnerUrl] = useState<string | null>(() => getCachedBrandingSplashRunnerUrl());

  useEffect(() => {
    restoreSession();
    fetchBrandingSplashUrl().then(setSplashUrl);
    fetchBrandingSplashRunnerUrl().then(setSplashRunnerUrl);
    trackAppOpen();
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
        badgeUrl={splashUrl}
        runnerUrl={splashRunnerUrl}
      />
    );
  }

  if (status === "authenticated") {
    return <MainApp />;
  }

  return <LoginPage />;
}

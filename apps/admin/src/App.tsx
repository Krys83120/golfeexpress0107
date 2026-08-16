import React, { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { SplashLoader } from "./components/SplashLoader";
import { DashboardPage } from "./pages/DashboardPage";
import { ValidationsPage } from "./pages/ValidationsPage";
import { UsersPage } from "./pages/UsersPage";
import { ProsPage } from "./pages/ProsPage";
import { RidersPage } from "./pages/RidersPage";
import { AdminFinancesPage } from "./pages/AdminFinancesPage";
import { PartnerPacksPage } from "./pages/PartnerPacksPage";
import { BrandingPage } from "./pages/BrandingPage";
import { SeoPage } from "./pages/SeoPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { useAdminDashboardStore } from "./store/useAdminDashboardStore";
import { useAuthStore } from "./store/useAuthStore";

function MainApp() {
  const [activePage, setActivePage] = useState("dashboard");
  const pendingCount = useAdminDashboardStore((s) => s.pendingValidations.length);

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage onNavigate={setActivePage} />;
      case "validations":
        return <ValidationsPage />;
      case "users":
        return <UsersPage />;
      case "pros":
        return <ProsPage />;
      case "riders":
        return <RidersPage />;
      case "finances":
        return <AdminFinancesPage />;
      case "partner-packs":
        return <PartnerPacksPage />;
      case "branding":
        return <BrandingPage />;
      case "seo":
        return <SeoPage />;
      case "settings":
        return <AdminSettingsPage />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  }

  return (
    <div className="flex min-h-screen bg-gris-light/30">
      <Sidebar activeItem={activePage} onSelect={setActivePage} pendingCount={pendingCount} />
      <main className="flex-1">{renderPage()}</main>
    </div>
  );
}

export default function App() {
  const status = useAuthStore((s) => s.status);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  // Écran de chargement animé affiché tant que `showSplash` est vrai — voir
  // apps/client/App.tsx pour le détail du raisonnement (identique ici).
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  if (showSplash) {
    return (
      <SplashLoader
        ready={status !== "idle" && status !== "loading"}
        onFinished={() => setShowSplash(false)}
      />
    );
  }

  if (status === "authenticated") {
    return <MainApp />;
  }

  return <LoginPage />;
}

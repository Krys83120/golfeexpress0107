import React, { useEffect, useState } from "react";
import type { OrderReportStatus } from "@golfeexpress/types";
import { Sidebar } from "./components/Sidebar";
import { SplashLoader } from "./components/SplashLoader";
import { DashboardPage } from "./pages/DashboardPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ValidationsPage } from "./pages/ValidationsPage";
import { UsersPage } from "./pages/UsersPage";
import { ProsPage } from "./pages/ProsPage";
import { RidersPage } from "./pages/RidersPage";
import { AdminFinancesPage } from "./pages/AdminFinancesPage";
import { PartnerPacksPage } from "./pages/PartnerPacksPage";
import { BrandingPage } from "./pages/BrandingPage";
import { SeoPage } from "./pages/SeoPage";
import { PlatformReviewsPage } from "./pages/PlatformReviewsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ContactMessagesPage } from "./pages/ContactMessagesPage";
import { CapacityPage } from "./pages/CapacityPage";
import { PricingPage } from "./pages/PricingPage";
import { AdminSettingsPage } from "./pages/AdminSettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { useAdminDashboardStore } from "./store/useAdminDashboardStore";
import { useAdminReportsStore } from "./store/useAdminReportsStore";
import { useAdminContactMessagesStore } from "./store/useAdminContactMessagesStore";
import { useAuthStore } from "./store/useAuthStore";
import { fetchAppSplashUrl } from "./services/brandingApi";

function MainApp() {
  const [activePage, setActivePage] = useState("dashboard");
  const pendingCount = useAdminDashboardStore((s) => s.pendingValidations.length);
  const openReportsCount = useAdminReportsStore((s) => s.openCount);
  const loadReports = useAdminReportsStore((s) => s.loadReports);
  const openContactMessagesCount = useAdminContactMessagesStore((s) => s.openCount);
  const loadContactMessages = useAdminContactMessagesStore((s) => s.loadMessages);

  // Chargé une fois au niveau racine (indépendamment de la page affichée)
  // pour que les badges "Réclamations"/"Messages" de la Sidebar soient
  // justes dès la connexion, même si l'admin ne visite jamais ces pages —
  // même raisonnement que pendingCount ci-dessus, chargé depuis DashboardPage.
  useEffect(() => {
    loadReports(["OPEN", "IN_PROGRESS"] as OrderReportStatus[]);
    loadContactMessages(["OPEN", "IN_PROGRESS"] as OrderReportStatus[]);
  }, []);

  function renderPage() {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage onNavigate={setActivePage} />;
      case "orders":
        return <OrdersPage />;
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
      case "platform-reviews":
        return <PlatformReviewsPage />;
      case "reports":
        return <ReportsPage />;
      case "contact-messages":
        return <ContactMessagesPage />;
      case "capacity":
        return <CapacityPage />;
      case "pricing":
        return <PricingPage />;
      case "settings":
        return <AdminSettingsPage />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  }

  return (
    <div className="flex min-h-screen bg-gris-light/30">
      <Sidebar
        activeItem={activePage}
        onSelect={setActivePage}
        pendingCount={pendingCount}
        openReportsCount={openReportsCount}
        openContactMessagesCount={openContactMessagesCount}
      />
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

  // Image du badge/mascotte de l'écran de chargement, réglable en direct
  // depuis Admin > Branding (rubrique "Écran de chargement"). Pas de cache
  // local ici (Admin est un outil interne, toujours en ligne) : simple
  // fetch au montage, avec repli sur la mascotte statique du build tant
  // qu'il n'est pas résolu.
  const [splashUrl, setSplashUrl] = useState<string | null>(null);

  useEffect(() => {
    restoreSession();
    fetchAppSplashUrl("admin").then(setSplashUrl);
  }, []);

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

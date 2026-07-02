import React, { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { ValidationsPage } from "./pages/ValidationsPage";
import { UsersPage } from "./pages/UsersPage";
import { ProsPage } from "./pages/ProsPage";
import { RidersPage } from "./pages/RidersPage";
import { AdminFinancesPage } from "./pages/AdminFinancesPage";
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

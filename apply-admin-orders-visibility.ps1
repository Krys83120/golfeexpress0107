# ============================================================================
# apply-admin-orders-visibility.ps1
#
# Ajoute la visibilite des commandes (en cours / en preparation / en
# livraison / terminees) dans le dashboard admin, qui n'existait pas du
# tout auparavant (aucune page, aucun composant ne listait les commandes
# cote admin -- contrairement a apps/pro qui a deja sa propre vue Kanban).
#
# Ajoute :
#   1. apps/admin/src/services/orderStatusLabels.ts   (nouveau -- libelles/couleurs par statut)
#   2. apps/admin/src/services/ordersApi.ts           (nouveau -- GET /api/orders cote admin)
#   3. apps/admin/src/store/useAdminOrdersStore.ts     (nouveau -- store zustand)
#   4. apps/admin/src/components/OrderStatusSummary.tsx (nouveau -- widget compteurs par statut)
#   5. apps/admin/src/pages/OrdersPage.tsx              (nouveau -- vue Kanban complete, toutes commandes)
#   6. apps/admin/src/pages/DashboardPage.tsx           (modifie -- ajoute le widget de synthese)
#   7. apps/admin/src/components/Sidebar.tsx            (modifie -- ajoute l'entree de menu "Commandes")
#   8. apps/admin/src/App.tsx                           (modifie -- ajoute la route "orders")
#
# S'appuie sur GET /api/orders, qui donne deja acces a TOUTES les commandes
# de la plateforme pour un role ADMIN/SUPER_ADMIN (aucune modification API
# necessaire -- voir apps/api/src/app/api/orders/route.ts).
#
# A executer depuis la RACINE du repo golfeexpress.
# ============================================================================

$ErrorActionPreference = "Stop"

function Write-FileUtf8NoBom {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir) { [System.IO.Directory]::CreateDirectory($dir) | Out-Null }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
    Write-Host "Ecrit : $Path"
}

function Update-FileContent {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Old,
        [Parameter(Mandatory=$true)][string]$New
    )
    $content = [System.IO.File]::ReadAllText($Path)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false

    if ($content.Contains($Old)) {
        $updated = $content.Replace($Old, $New)
        [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
        Write-Host "Modifie : $Path"
        return
    }

    # Repli : tolere les lignes "vides" avec espaces de fin invisibles.
    $oldLines = $Old -split "`n"
    $patternParts = foreach ($line in $oldLines) {
        if ($line.Trim().Length -eq 0) { '[ \t]*' } else { [regex]::Escape($line) }
    }
    $pattern = [string]::Join("`n", $patternParts)
    $regexMatches = [regex]::Matches($content, $pattern)

    if ($regexMatches.Count -eq 1) {
        $m = $regexMatches[0]
        $updated = $content.Substring(0, $m.Index) + $New + $content.Substring($m.Index + $m.Length)
        [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
        Write-Host "Modifie (espaces de fin de ligne tolerees) : $Path"
        return
    }
    if ($regexMatches.Count -gt 1) {
        throw "Ancien texte trouve plusieurs fois dans $Path (ambigu) -- edition annulee, verifie ce fichier a la main."
    }

    # Deja applique lors d'une execution precedente : on n'echoue pas.
    if ($content.Contains($New)) {
        Write-Host "Deja applique, ignore : $Path"
        return
    }

    throw "Ancien texte introuvable dans $Path (le fichier a peut-etre change depuis) -- edition annulee, verifie ce fichier a la main."
}

# ============================================================================
# 1. apps/admin/src/services/orderStatusLabels.ts (nouveau)
# ============================================================================

Write-FileUtf8NoBom -Path "apps/admin/src/services/orderStatusLabels.ts" -Content @'
import { OrderStatus } from "@golfeexpress/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string; bg: string; text: string }> = {
  [OrderStatus.PENDING]: { label: "En attente", bg: "#FFF3E0", text: "#FF6B35" },
  [OrderStatus.CONFIRMED]: { label: "Confirmée", bg: "#E3F2FD", text: "#2196F3" },
  [OrderStatus.PREPARING]: { label: "En préparation", bg: "#FFF3E0", text: "#FF6B35" },
  [OrderStatus.READY]: { label: "Prête", bg: "#E3F2FD", text: "#2196F3" },
  [OrderStatus.RIDER_ASSIGNED]: { label: "Livreur assigné", bg: "#F3E5F5", text: "#9C27B0" },
  [OrderStatus.PICKED_UP]: { label: "Récupérée", bg: "#F3E5F5", text: "#9C27B0" },
  [OrderStatus.IN_DELIVERY]: { label: "En livraison", bg: "#F3E5F5", text: "#9C27B0" },
  [OrderStatus.DELIVERED]: { label: "Livrée", bg: "#E8F5E9", text: "#2ECC71" },
  [OrderStatus.CANCELLED]: { label: "Annulée", bg: "#FFEBEE", text: "#F44336" },
  [OrderStatus.REFUNDED]: { label: "Remboursée", bg: "#FFEBEE", text: "#F44336" },
};
'@

# ============================================================================
# 2. apps/admin/src/services/ordersApi.ts (nouveau)
# ============================================================================

Write-FileUtf8NoBom -Path "apps/admin/src/services/ordersApi.ts" -Content @'
import { apiFetch } from "@/services/apiClient";
import type { Order, OrderStatus } from "@golfeexpress/types";

/**
 * GET /api/orders — vue Admin.
 *
 * Pour un rôle ADMIN/SUPER_ADMIN, cet endpoint renvoie déjà l'ensemble des
 * commandes de la plateforme (tous commerçants confondus), sans filtre
 * additionnel côté serveur — voir apps/api/src/app/api/orders/route.ts,
 * bloc "ADMIN / SUPER_ADMIN : pas de filtre additionnel, vue complète."
 *
 * Note : l'endpoint plafonne à 50 commandes (les plus récentes en
 * premier). Suffisant pour une vue "temps réel" du flux en cours ; pour un
 * historique complet il faudrait un endpoint paginé dédié.
 */
export async function fetchAllOrders(statusFilter?: OrderStatus[]): Promise<Order[]> {
  const query = statusFilter && statusFilter.length > 0 ? `?status=${statusFilter.join(",")}` : "";
  const data = await apiFetch<{ orders: Order[] }>(`/api/orders${query}`);
  return data.orders;
}
'@

# ============================================================================
# 3. apps/admin/src/store/useAdminOrdersStore.ts (nouveau)
# ============================================================================

Write-FileUtf8NoBom -Path "apps/admin/src/store/useAdminOrdersStore.ts" -Content @'
import { create } from "zustand";
import type { Order } from "@golfeexpress/types";
import { fetchAllOrders } from "@/services/ordersApi";

interface AdminOrdersState {
  orders: Order[];
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;

  loadOrders: () => Promise<void>;
}

export const useAdminOrdersStore = create<AdminOrdersState>((set) => ({
  orders: [],
  status: "idle",
  error: null,

  loadOrders: async () => {
    set({ status: "loading", error: null });
    try {
      const orders = await fetchAllOrders();
      set({ orders, status: "loaded" });
    } catch (err) {
      set({ status: "error", error: err instanceof Error ? err.message : "Impossible de charger les commandes." });
    }
  },
}));
'@

# ============================================================================
# 4. apps/admin/src/components/OrderStatusSummary.tsx (nouveau)
# ============================================================================

Write-FileUtf8NoBom -Path "apps/admin/src/components/OrderStatusSummary.tsx" -Content @'
import React from "react";
import { OrderStatus, type Order } from "@golfeexpress/types";

interface StatusBucket {
  key: string;
  label: string;
  emoji: string;
  statuses: OrderStatus[];
  color: string;
}

// Mêmes regroupements que le Kanban de apps/pro/src/pages/OrdersPage.tsx,
// pour rester cohérent entre les deux apps — et reprend exactement les
// quatre états demandés (en cours, en préparation, en livraison, terminées).
const BUCKETS: StatusBucket[] = [
  { key: "new", label: "Nouvelles", emoji: "🆕", statuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED], color: "#FF6B35" },
  { key: "preparing", label: "En préparation", emoji: "👨‍🍳", statuses: [OrderStatus.PREPARING], color: "#FF6B35" },
  { key: "ready", label: "Prêtes", emoji: "✅", statuses: [OrderStatus.READY], color: "#2196F3" },
  {
    key: "delivering",
    label: "En livraison",
    emoji: "🛵",
    statuses: [OrderStatus.RIDER_ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_DELIVERY],
    color: "#9C27B0",
  },
  { key: "done", label: "Terminées", emoji: "🏁", statuses: [OrderStatus.DELIVERED, OrderStatus.CANCELLED], color: "#2ECC71" },
];

interface OrderStatusSummaryProps {
  orders: Order[];
  onViewAll?: () => void;
}

export function OrderStatusSummary({ orders, onViewAll }: OrderStatusSummaryProps) {
  return (
    <div className="mb-6 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-nuit">🧾 Commandes par statut</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-sm font-semibold text-golfe-green">
            Voir tout
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="py-6 text-center text-sm text-gris">Aucune commande pour le moment.</p>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {BUCKETS.map((bucket) => {
            const count = orders.filter((o) => bucket.statuses.includes(o.status)).length;
            return (
              <button
                key={bucket.key}
                onClick={onViewAll}
                className="flex flex-col items-center gap-1 rounded-sm py-4 transition-colors hover:bg-gris-light/50"
                style={{ backgroundColor: `${bucket.color}0D` }}
              >
                <span className="text-2xl">{bucket.emoji}</span>
                <span className="font-heading text-xl font-extrabold" style={{ color: bucket.color }}>
                  {count}
                </span>
                <span className="text-xs text-gris">{bucket.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
'@

# ============================================================================
# 5. apps/admin/src/pages/OrdersPage.tsx (nouveau)
# ============================================================================

Write-FileUtf8NoBom -Path "apps/admin/src/pages/OrdersPage.tsx" -Content @'
import React, { useEffect } from "react";
import { OrderStatus } from "@golfeexpress/types";
import { useAdminOrdersStore } from "@/store/useAdminOrdersStore";
import { ORDER_STATUS_LABELS } from "@/services/orderStatusLabels";

interface KanbanColumn {
  title: string;
  emoji: string;
  statuses: OrderStatus[];
}

// Mêmes colonnes que le Kanban de apps/pro/src/pages/OrdersPage.tsx, mais
// ici toutes boutiques confondues (vue plateforme) et en lecture seule --
// l'admin observe le flux, la gestion (avancer/annuler) reste au Pro/Rider.
const COLUMNS: KanbanColumn[] = [
  { title: "Nouvelles", emoji: "🆕", statuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
  { title: "En préparation", emoji: "👨‍🍳", statuses: [OrderStatus.PREPARING] },
  { title: "Prêtes", emoji: "✅", statuses: [OrderStatus.READY] },
  {
    title: "En livraison",
    emoji: "🛵",
    statuses: [OrderStatus.RIDER_ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_DELIVERY],
  },
  { title: "Terminées", emoji: "🏁", statuses: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
];

function formatPlacedAt(isoDate: string): string {
  const minutes = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 24 * 60) return `il y a ${Math.round(minutes / 60)}h`;
  return new Date(isoDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function OrdersPage() {
  const orders = useAdminOrdersStore((s) => s.orders);
  const status = useAdminOrdersStore((s) => s.status);
  const error = useAdminOrdersStore((s) => s.error);
  const loadOrders = useAdminOrdersStore((s) => s.loadOrders);

  useEffect(() => {
    loadOrders();
    // Vue Admin temps réel : les commandes changent de statut en continu
    // (actions Pro/Rider), donc on rafraîchit périodiquement comme pour la
    // carte live du Dashboard (voir DashboardPage.tsx) plutôt que d'exiger
    // un rechargement manuel de la page.
    const interval = setInterval(() => loadOrders(), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Commandes</h1>
        <p className="text-sm text-gris">
          Vue d'ensemble de toutes les commandes de la plateforme, tous commerçants confondus
        </p>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">
          {error}{" "}
          <button onClick={loadOrders} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {status === "loading" && orders.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Chargement des commandes...</p>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {COLUMNS.map((column) => {
            const columnOrders = orders.filter((o) => column.statuses.includes(o.status));
            return (
              <div key={column.title} className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-nuit">
                    {column.emoji} {column.title}
                  </h3>
                  <span className="rounded-full bg-gris-light px-2 py-0.5 text-xs font-semibold text-gris">
                    {columnOrders.length}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  {columnOrders.length === 0 ? (
                    <div className="rounded border-2 border-dashed border-gris-light p-6 text-center text-xs text-gris">
                      Aucune commande
                    </div>
                  ) : (
                    columnOrders.map((order) => {
                      const statusMeta = ORDER_STATUS_LABELS[order.status];
                      const clientName = order.client?.user
                        ? `${order.client.user.firstName} ${order.client.user.lastName}`
                        : "—";
                      return (
                        <div
                          key={order.id}
                          className="rounded bg-white p-3 shadow-sm"
                          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm font-semibold text-nuit">{order.orderNumber}</span>
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ backgroundColor: statusMeta.bg, color: statusMeta.text }}
                            >
                              {statusMeta.label}
                            </span>
                          </div>
                          <p className="truncate text-xs text-gris">{order.pro?.businessName ?? "Commerçant inconnu"}</p>
                          <p className="truncate text-xs text-gris">{clientName}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm font-bold text-nuit">{Number(order.total).toFixed(2)} €</span>
                            <span className="text-[11px] text-gris">{formatPlacedAt(order.placedAt)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
'@

# ============================================================================
# 6. apps/admin/src/pages/DashboardPage.tsx (modifie) -- ajoute le widget
#    de synthese des commandes par statut, juste sous les 4 StatCard.
# ============================================================================

$dashboardPath = "apps/admin/src/pages/DashboardPage.tsx"

Update-FileContent -Path $dashboardPath `
  -Old @'
import { useAdminDashboardStore } from "@/store/useAdminDashboardStore";
import { useAdminSettingsStore } from "@/store/useAdminSettingsStore";
'@ `
  -New @'
import { useAdminDashboardStore } from "@/store/useAdminDashboardStore";
import { useAdminSettingsStore } from "@/store/useAdminSettingsStore";
import { useAdminOrdersStore } from "@/store/useAdminOrdersStore";
import { OrderStatusSummary } from "@/components/OrderStatusSummary";
'@

Update-FileContent -Path $dashboardPath `
  -Old @'
  const settings = useAdminSettingsStore((s) => s.settings);
  const loadSettings = useAdminSettingsStore((s) => s.loadSettings);

  const [stats, setStats] = useState<AdminStats | null>(null);
'@ `
  -New @'
  const settings = useAdminSettingsStore((s) => s.settings);
  const loadSettings = useAdminSettingsStore((s) => s.loadSettings);

  const orders = useAdminOrdersStore((s) => s.orders);
  const loadOrders = useAdminOrdersStore((s) => s.loadOrders);

  const [stats, setStats] = useState<AdminStats | null>(null);
'@

Update-FileContent -Path $dashboardPath `
  -Old @'
  useEffect(() => {
    loadPendingValidations();
    loadSettings();

    Promise.all([fetchAdminStats(), fetchSupportedCities(), fetchLiveRiders()])
      .then(([statsData, citiesData, ridersData]) => {
        setStats(statsData);
        setCities(citiesData);
        setLiveRiders(ridersData);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Impossible de charger le dashboard."));

    // Rafraîchit la carte live toutes les 15s. TODO: remplacer par une
    // souscription Supabase Realtime (postgres_changes sur Rider) — voir
    // apps/api/REALTIME.md.
    const interval = setInterval(() => {
      fetchLiveRiders().then(setLiveRiders).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);
'@ `
  -New @'
  useEffect(() => {
    loadPendingValidations();
    loadSettings();
    loadOrders();

    Promise.all([fetchAdminStats(), fetchSupportedCities(), fetchLiveRiders()])
      .then(([statsData, citiesData, ridersData]) => {
        setStats(statsData);
        setCities(citiesData);
        setLiveRiders(ridersData);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Impossible de charger le dashboard."));

    // Rafraîchit la carte live et les commandes toutes les 15s. TODO:
    // remplacer par une souscription Supabase Realtime (postgres_changes
    // sur Rider / Order) — voir apps/api/REALTIME.md.
    const interval = setInterval(() => {
      fetchLiveRiders().then(setLiveRiders).catch(() => {});
      loadOrders();
    }, 15000);
    return () => clearInterval(interval);
  }, []);
'@

Update-FileContent -Path $dashboardPath `
  -Old @'
      {/* CHART + LIVE MAP */}
'@ `
  -New @'
      {/* COMMANDES PAR STATUT */}
      <OrderStatusSummary orders={orders} onViewAll={() => onNavigate?.("orders")} />

      {/* CHART + LIVE MAP */}
'@

# ============================================================================
# 7. apps/admin/src/components/Sidebar.tsx (modifie) -- ajoute l'entree de
#    menu "Commandes", juste apres "Dashboard".
# ============================================================================

$sidebarPath = "apps/admin/src/components/Sidebar.tsx"

Update-FileContent -Path $sidebarPath `
  -Old @'
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Store,
  Bike,
  Wallet,
  Crown,
  Settings,
  Palette,
  Search,
  LogOut,
} from "lucide-react";
'@ `
  -New @'
import {
  LayoutDashboard,
  Package,
  ShieldCheck,
  Users,
  Store,
  Bike,
  Wallet,
  Crown,
  Settings,
  Palette,
  Search,
  LogOut,
} from "lucide-react";
'@

Update-FileContent -Path $sidebarPath `
  -Old @'
  const navItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { key: "validations", label: "Validations KYC", icon: <ShieldCheck size={18} />, badge: pendingCount },
'@ `
  -New @'
  const navItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { key: "orders", label: "Commandes", icon: <Package size={18} /> },
    { key: "validations", label: "Validations KYC", icon: <ShieldCheck size={18} />, badge: pendingCount },
'@

# ============================================================================
# 8. apps/admin/src/App.tsx (modifie) -- ajoute la route "orders".
# ============================================================================

$appPath = "apps/admin/src/App.tsx"

Update-FileContent -Path $appPath `
  -Old @'
import { DashboardPage } from "./pages/DashboardPage";
import { ValidationsPage } from "./pages/ValidationsPage";
'@ `
  -New @'
import { DashboardPage } from "./pages/DashboardPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ValidationsPage } from "./pages/ValidationsPage";
'@

Update-FileContent -Path $appPath `
  -Old @'
      case "dashboard":
        return <DashboardPage onNavigate={setActivePage} />;
      case "validations":
        return <ValidationsPage />;
'@ `
  -New @'
      case "dashboard":
        return <DashboardPage onNavigate={setActivePage} />;
      case "orders":
        return <OrdersPage />;
      case "validations":
        return <ValidationsPage />;
'@

# ============================================================================
Write-Host ""
Write-Host "=== Termine ===" -ForegroundColor Green
Write-Host "Nouveau : une entree 'Commandes' dans le menu admin (Kanban complet,"
Write-Host "toutes boutiques confondues), + un widget de synthese par statut"
Write-Host "directement sur le Dashboard (Nouvelles / En preparation / Pretes /"
Write-Host "En livraison / Terminees), avec un lien 'Voir tout' vers la page complete."
Write-Host ""
Write-Host "Pour tester en local puis redeployer :"
Write-Host "  cd apps/admin"
Write-Host "  npm run build"
Write-Host "  vercel --prod"
Write-Host "  cd ../.."
Write-Host ""
Write-Host "(Si apps/admin utilise un autre projet Vercel que celui lie par defaut,"
Write-Host "verifie d'abord avec 'vercel link' -- meme logique que pour apps/client/apps/livreur.)"
Write-Host ""

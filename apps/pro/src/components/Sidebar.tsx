import React from "react";
import {
  LayoutDashboard,
  ClipboardList,
  UtensilsCrossed,
  Wallet,
  Star,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getCategoryEmoji } from "@/services/categoryVisuals";

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { key: "orders", label: "Commandes", icon: <ClipboardList size={18} /> },
  { key: "menu", label: "Mon menu", icon: <UtensilsCrossed size={18} /> },
  { key: "finances", label: "Finances", icon: <Wallet size={18} /> },
  { key: "reviews", label: "Avis clients", icon: <Star size={18} /> },
  { key: "settings", label: "Paramètres", icon: <Settings size={18} /> },
];

interface SidebarProps {
  activeItem: string;
  onSelect: (key: string) => void;
}

export function Sidebar({ activeItem, onSelect }: SidebarProps) {
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);

  const emoji = profile ? getCategoryEmoji(profile.category) : "🏪";
  const isOpen = profile?.status === "ACTIVE";

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gris-light bg-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="text-2xl">🦎</span>
        <div>
          <p className="font-heading text-base font-extrabold text-nuit">GolfeExpress</p>
          <p className="text-xs text-gris">Espace Pro</p>
        </div>
      </div>

      <div className="mx-4 mb-4 flex items-center gap-3 rounded-sm bg-gris-light p-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-corail text-lg">{emoji}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-nuit">{profile?.businessName ?? "Ma boutique"}</p>
          <p className="text-xs" style={{ color: isOpen ? "#2ECC71" : "#FF6B35" }}>
            ● {isOpen ? "Ouvert" : "En attente de validation"}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeItem;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className="mb-1 flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "rgba(46,204,113,0.08)" : "transparent",
                color: isActive ? "#2ECC71" : "#1A1A2E",
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gris-light p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-gris hover:bg-gris-light"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

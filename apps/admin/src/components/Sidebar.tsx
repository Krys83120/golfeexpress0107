import React from "react";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Store,
  Bike,
  Wallet,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  activeItem: string;
  onSelect: (key: string) => void;
  pendingCount: number;
}

export function Sidebar({ activeItem, onSelect, pendingCount }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const navItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { key: "validations", label: "Validations KYC", icon: <ShieldCheck size={18} />, badge: pendingCount },
    { key: "users", label: "Utilisateurs", icon: <Users size={18} /> },
    { key: "pros", label: "Commerçants", icon: <Store size={18} /> },
    { key: "riders", label: "Livreurs", icon: <Bike size={18} /> },
    { key: "finances", label: "Finances", icon: <Wallet size={18} /> },
    { key: "settings", label: "Paramètres globaux", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gris-light bg-nuit">
      <div className="flex items-center gap-2 px-6 py-6">
        <span className="text-5xl">🦎</span>
        <div>
          <p className="notranslate font-heading text-base font-extrabold text-white" translate="no">Do You Geckoo</p>
          <p className="text-xs text-white/50">
            {user ? `${user.firstName} ${user.lastName}` : "Super Admin"}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3">
        {navItems.map((item) => {
          const isActive = item.key === activeItem;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className="mb-1 flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? "rgba(46,204,113,0.15)" : "transparent",
                color: isActive ? "#2ECC71" : "rgba(255,255,255,0.85)",
              }}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {!!item.badge && item.badge > 0 && (
                <span className="rounded-full bg-corail px-2 py-0.5 text-[11px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5"
        >
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

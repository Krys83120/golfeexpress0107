import React, { useEffect, useState } from "react";
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
  MessageSquareText,
  AlertTriangle,
  Mail,
  MapPinned,
  Euro,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { fetchAppLogoUrl } from "@/services/brandingApi";

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
  openReportsCount: number;
  openContactMessagesCount: number;
}

export function Sidebar({
  activeItem,
  onSelect,
  pendingCount,
  openReportsCount,
  openContactMessagesCount,
}: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchAppLogoUrl("admin").then(setLogoUrl);
  }, []);

  const navItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { key: "orders", label: "Commandes", icon: <Package size={18} /> },
    { key: "validations", label: "Validations KYC", icon: <ShieldCheck size={18} />, badge: pendingCount },
    { key: "reports", label: "Réclamations", icon: <AlertTriangle size={18} />, badge: openReportsCount },
    { key: "contact-messages", label: "Messages", icon: <Mail size={18} />, badge: openContactMessagesCount },
    { key: "capacity", label: "Zones & Capacité", icon: <MapPinned size={18} /> },
    { key: "pricing", label: "Tarification", icon: <Euro size={18} /> },
    { key: "users", label: "Utilisateurs", icon: <Users size={18} /> },
    { key: "pros", label: "Commerçants", icon: <Store size={18} /> },
    { key: "riders", label: "Livreurs", icon: <Bike size={18} /> },
    { key: "finances", label: "Finances", icon: <Wallet size={18} /> },
    { key: "partner-packs", label: "Packs Partenaires", icon: <Crown size={18} /> },
    { key: "branding", label: "Branding", icon: <Palette size={18} /> },
    { key: "seo", label: "SEO / GEO", icon: <Search size={18} /> },
    { key: "platform-reviews", label: "Avis plateforme", icon: <MessageSquareText size={18} /> },
    { key: "settings", label: "Paramètres globaux", icon: <Settings size={18} /> },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gris-light bg-nuit">
      <div className="flex flex-col items-start gap-1 px-4 py-4">
        {logoUrl ? (
          // Le logo contient déjà le nom "Do You Geckoo" — pas de texte
          // redondant à côté. Nettement plus grand.
          <img src={logoUrl} alt="Do You Geckoo" className="h-56 w-56 object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-5xl">🦎</span>
            <p className="notranslate font-heading text-base font-extrabold text-white" translate="no">Do You Geckoo</p>
          </div>
        )}
        <p className="text-xs text-white/50">
          {user ? `${user.firstName} ${user.lastName}` : "Super Admin"}
        </p>
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

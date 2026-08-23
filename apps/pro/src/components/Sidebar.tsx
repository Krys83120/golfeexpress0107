import React, { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Wallet,
  Crown,
  Star,
  Bell,
  Settings,
  LogOut,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { getCategoryEmoji } from "@/services/categoryVisuals";
import { fetchBrandingLogoUrl, getCachedBrandingLogoUrl } from "@/services/brandingApi";

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { key: "orders", label: "Commandes", icon: <ClipboardList size={18} /> },
  { key: "menu", label: "Produits", icon: <Package size={18} /> },
  { key: "finances", label: "Finances", icon: <Wallet size={18} /> },
  { key: "subscription", label: "Abonnement", icon: <Crown size={18} /> },
  { key: "reviews", label: "Avis clients", icon: <Star size={18} /> },
  { key: "notifications", label: "Notifications", icon: <Bell size={18} /> },
  { key: "employees", label: "Équipe", icon: <Users size={18} /> },
  { key: "settings", label: "Paramètres", icon: <Settings size={18} /> },
];

/**
 * Nav visible pour un compte employé (role PRO_EMPLOYEE) -- volontairement
 * restreinte aux commandes en cours + notifications (impression des tickets
 * incluse dans la page Commandes). Jamais Finances/Abonnement/Avis/Réglages
 * ni le Dashboard, qui expose le chiffre d'affaires -- voir ProEmployee dans
 * prisma/schema.prisma et le commentaire équivalent côté serveur dans
 * requireProOrEmployee() (apps/api/src/middleware/auth.ts).
 */
const EMPLOYEE_NAV_KEYS = new Set(["orders", "notifications"]);

interface SidebarProps {
  activeItem: string;
  onSelect: (key: string) => void;
}

export function Sidebar({ activeItem, onSelect }: SidebarProps) {
  const profile = useAuthStore((s) => s.profile);
  const logout = useAuthStore((s) => s.logout);
  const isEmployee = useAuthStore((s) => s.isEmployee);
  const [logoUrl, setLogoUrl] = useState<string | null>(() => getCachedBrandingLogoUrl());
  // Tiroir hors-écran sur mobile/tablette (< lg) -- fermé par défaut. À
  // partir de lg, la Sidebar reste toujours visible en position statique
  // (voir les classes lg: ci-dessous), cet état n'a alors plus d'effet.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchBrandingLogoUrl().then(setLogoUrl);
  }, []);

  const emoji = profile ? getCategoryEmoji(profile.category) : "🏪";
  const isOpen = profile?.status === "ACTIVE";
  const navItems = isEmployee ? NAV_ITEMS.filter((item) => EMPLOYEE_NAV_KEYS.has(item.key)) : NAV_ITEMS;

  // Referme le tiroir après sélection -- sans effet sur desktop (lg:) où la
  // Sidebar reste statique quel que soit `open`.
  function handleSelect(key: string) {
    onSelect(key);
    setOpen(false);
  }

  return (
    <>
      {/* Bouton hamburger -- mobile/tablette uniquement, masqué quand le
          tiroir est déjà ouvert (le bouton de fermeture prend le relais). */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-nuit shadow-md lg:hidden"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Fond semi-transparent -- ferme le tiroir au clic en dehors, mobile/tablette uniquement. */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-nuit/40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-gris-light bg-white transition-transform duration-200 ease-out lg:static lg:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-start justify-between gap-2 px-4 py-4">
          <div className="flex flex-col items-start gap-1">
            {logoUrl ? (
              // Le logo contient déjà le nom "Do You Geckoo" — pas de texte
              // redondant à côté. Nettement plus grand pour bien se voir.
              <img src={logoUrl} alt="Do You Geckoo" className="h-56 w-56 object-contain" />
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-5xl">🦎</span>
                <p className="notranslate font-heading text-base font-extrabold text-nuit" translate="no">Do You Geckoo</p>
              </div>
            )}
            {/* Logo texte "Do You Geckoo" (image statique, 22/08/2026) — affiché
                en dessous de la mascotte réglable depuis Admin > Branding. */}
            <img src="/wordmark-logo.png" alt="Do You Geckoo" className="h-9 w-auto object-contain" />
            <p className="text-xs text-gris">Espace Pro</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="rounded-sm p-1.5 text-gris hover:bg-gris-light lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-4 mb-4 flex items-center gap-3 rounded-sm bg-gris-light p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-corail text-lg">{emoji}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-nuit">{profile?.businessName ?? "Ma boutique"}</p>
            {isEmployee ? (
              <p className="text-xs text-gris">👤 Compte employé</p>
            ) : (
              <p className="text-xs" style={{ color: isOpen ? "#2ECC71" : "#FF6B35" }}>
                ● {isOpen ? "Ouvert" : "En attente de validation"}
              </p>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          {navItems.map((item) => {
            const isActive = item.key === activeItem;
            return (
              <button
                key={item.key}
                onClick={() => handleSelect(item.key)}
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
    </>
  );
}

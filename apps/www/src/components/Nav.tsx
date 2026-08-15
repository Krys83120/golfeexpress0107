import { fetchBrandingLogoUrl } from "@/lib/brandingApi";
import { NavClient } from "@/components/NavClient";

/**
 * Composant serveur volontairement — permet de récupérer le logo dynamique
 * AVANT le premier rendu envoyé au navigateur (contrairement aux 3 apps
 * Client/Livreur/Pro qui sont des SPA sans rendu serveur et doivent donc
 * ruser avec un cache local pour limiter le flash de l'emoji 🦎 par
 * défaut). Ici, avec Next.js, on peut simplement ne JAMAIS avoir ce flash.
 */
export async function Nav() {
  const logoUrl = await fetchBrandingLogoUrl();
  return <NavClient logoUrl={logoUrl} />;
}

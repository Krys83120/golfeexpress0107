import type { MetadataRoute } from "next";

/**
 * Convention de fichier Next.js -- généré et lié automatiquement dans le
 * <head> (pas besoin d'un <link rel="manifest"> manuel), servi à
 * /manifest.webmanifest. Le site vitrine n'est pas une PWA installable au
 * sens propre (pas de service worker), mais un manifest correct reste
 * attendu pour la cohérence des icônes multi-app (Site/Client/Pro/Livreur
 * ont chacune leur propre identité visuelle) et pour le "Ajouter à l'écran
 * d'accueil" que les navigateurs mobiles proposent de toute façon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Do You Geckoo — Livraison locale du Golfe de Saint-Tropez",
    short_name: "Do You Geckoo",
    description: "Plateforme de livraison locale connectant commerçants, clients et livreurs du Golfe de Saint-Tropez.",
    start_url: "/",
    display: "browser",
    background_color: "#10182B",
    theme_color: "#2ECC71",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}

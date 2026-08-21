import { fetchPublicPros } from "@/lib/publicApi";
import { ProsCarouselClient } from "@/components/ProsCarouselClient";

/**
 * Composant serveur volontairement (comme Nav.tsx / Footer.tsx / JoinUs.tsx)
 * — récupère la liste des commerçants ACTIFS (voir fetchPublicPros, qui
 * filtre déjà status === "ACTIVE") avant de la passer au carrousel client.
 * Aucune liste codée en dur : dès qu'un commerçant est inscrit ET validé
 * (passe en ACTIVE côté admin), il apparaît automatiquement ici au prochain
 * chargement de page, sans intervention manuelle.
 */
export async function ProsCarousel() {
  const pros = await fetchPublicPros();
  return <ProsCarouselClient pros={pros} />;
}

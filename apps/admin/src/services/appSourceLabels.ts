import { AppSource } from "@golfeexpress/types";

/**
 * Libellés/couleurs affichés pour chaque app trackée dans Admin > Visites
 * (voir VisitsPage.tsx et VisitsTrendChart.tsx). `Record<AppSource, ...>`
 * délibérément exhaustif : si AppSource gagne une valeur un jour, le build
 * échouera ici tant que ce fichier n'est pas mis à jour (voir la même
 * remarque sur userLabels.ts/ROLE_LABELS -- leçon du build cassé lors de
 * l'ajout de PRO_EMPLOYEE à UserRole).
 */
export const APP_SOURCE_LABELS: Record<AppSource, { label: string; emoji: string; color: string }> = {
  [AppSource.WWW]: { label: "Site vitrine", emoji: "🌐", color: "#2ECC71" },
  [AppSource.CLIENT]: { label: "App Client", emoji: "🧑", color: "#2196F3" },
  [AppSource.PRO]: { label: "App Pro", emoji: "🏪", color: "#FF6B35" },
  [AppSource.LIVREUR]: { label: "App Livreur", emoji: "🛵", color: "#9B59B6" },
};

export const APP_SOURCE_ORDER: AppSource[] = [AppSource.WWW, AppSource.CLIENT, AppSource.PRO, AppSource.LIVREUR];

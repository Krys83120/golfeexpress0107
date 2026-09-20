import { apiFetch } from "@/services/apiClient";

/**
 * Compteur de vues (19/09/2026, demande explicite de Krys) -- voir
 * GET /api/pros/me/views côté serveur pour le détail complet du tracking
 * réutilisé (AppVisit, chemins "/pro/<proId>" et "/pro/<proId>/product/<id>").
 */
export interface ProductViewRow {
  productId: string;
  name: string;
  views: number;
}

export interface MyViews {
  pageViews: number;
  productViews: ProductViewRow[];
}

/** GET /api/pros/me/views */
export async function fetchMyViews(): Promise<MyViews> {
  return apiFetch<MyViews>("/api/pros/me/views");
}

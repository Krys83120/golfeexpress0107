import { apiFetch } from "@/services/apiClient";

/**
 * Compteur de vues Admin (19/09/2026, demande explicite de Krys) -- voir
 * GET /api/admin/analytics/pro-views côté serveur pour le détail complet du
 * tracking réutilisé (AppVisit, chemins "/pro/<proId>" et
 * "/pro/<proId>/product/<id>").
 */
export interface AdminProViewRow {
  proId: string;
  businessName: string;
  views: number;
}

export interface AdminProductViewRow {
  productId: string;
  name: string;
  proId: string;
  businessName: string;
  views: number;
}

export interface AdminProViews {
  proViews: AdminProViewRow[];
  productViews: AdminProductViewRow[];
}

/** GET /api/admin/analytics/pro-views */
export async function fetchAdminProViews(): Promise<AdminProViews> {
  return apiFetch<AdminProViews>("/api/admin/analytics/pro-views");
}

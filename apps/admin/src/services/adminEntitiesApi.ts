import { apiFetch } from "@/services/apiClient";
import type { User, Pro, Rider, Address, Product, Review } from "@golfeexpress/types";

/** GET /api/admin/pros/:proId/products */
export async function fetchAdminProProducts(proId: string): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>(`/api/admin/pros/${proId}/products`);
  return data.products;
}

/** PATCH /api/admin/pros/:proId/products/:productId */
export async function toggleAdminProduct(proId: string, productId: string, isAvailable: boolean): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(`/api/admin/pros/${proId}/products/${productId}`, {
    method: "PATCH",
    body: { isAvailable },
  });
  return data.product;
}

/** PATCH /api/admin/pros/:proId/products/rename-category — modération : renomme/fusionne une catégorie. */
export async function renameAdminProductCategory(proId: string, oldName: string, newName: string): Promise<number> {
  const data = await apiFetch<{ updatedCount: number }>(`/api/admin/pros/${proId}/products/rename-category`, {
    method: "PATCH",
    body: { oldName, newName },
  });
  return data.updatedCount;
}

export interface AdminMenuCategoryRow {
  name: string;
  count: number;
  image: string | null;
  sortOrder: number | null;
}

/** GET /api/admin/pros/:proId/categories — catégories de menu avec ordre + photo (voir model MenuCategory). */
export async function fetchAdminCategories(proId: string): Promise<AdminMenuCategoryRow[]> {
  const data = await apiFetch<{ categories: AdminMenuCategoryRow[] }>(`/api/admin/pros/${proId}/categories`);
  return data.categories;
}

/** PUT /api/admin/pros/:proId/categories — enregistre le nouvel ordre après glisser-déposer (liste complète des noms). */
export async function reorderAdminCategories(proId: string, order: string[]): Promise<void> {
  await apiFetch(`/api/admin/pros/${proId}/categories`, { method: "PUT", body: { order } });
}

/**
 * POST /api/admin/pros/:proId/categories/image — upload la photo d'une
 * catégorie (image encodée en base64 côté appelant, voir la route pour le
 * détail). Convertit le File en base64 ici pour garder apiFetch (JSON
 * uniquement) inchangé plutôt que de lui ajouter un chemin multipart.
 */
export async function uploadAdminCategoryImage(proId: string, category: string, file: File): Promise<string> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Format non supporté. Utilisez JPEG, PNG ou WebP.");
  }
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const imageBase64 = btoa(binary);

  const data = await apiFetch<{ image: string }>(`/api/admin/pros/${proId}/categories/image`, {
    method: "POST",
    body: { category, contentType: file.type, imageBase64 },
  });
  return data.image;
}

/** PUT /api/admin/pros/:proId/products/reorder — enregistre l'ordre des produits d'une catégorie après glisser-déposer. */
export async function reorderAdminProducts(proId: string, productIds: string[]): Promise<void> {
  await apiFetch(`/api/admin/pros/${proId}/products/reorder`, { method: "PUT", body: { productIds } });
}

/**
 * PATCH /api/admin/pros/:proId/products/rename — renomme UN produit (à ne
 * pas confondre avec renameAdminProductCategory, qui renomme/fusionne une
 * catégorie entière). Utilisé pour corriger le nom d'un produit importé
 * (ex: accents corrompus par un CSV) depuis la liste dépliée d'une
 * catégorie dans AdminCategoryManagerModal.tsx.
 */
export async function renameAdminProduct(proId: string, productId: string, name: string): Promise<string> {
  const data = await apiFetch<{ id: string; name: string }>(`/api/admin/pros/${proId}/products/rename`, {
    method: "PATCH",
    body: { productId, name },
  });
  return data.name;
}

/**
 * POST /api/admin/pros/:proId/products/photo — upload la photo d'UN
 * produit (à ne pas confondre avec uploadAdminCategoryImage, qui gère la
 * photo d'une catégorie entière). Même logique de conversion en base64 que
 * uploadAdminCategoryImage.
 */
export async function uploadAdminProductImage(proId: string, productId: string, file: File): Promise<string> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new Error("Format non supporté. Utilisez JPEG, PNG ou WebP.");
  }
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const imageBase64 = btoa(binary);

  const data = await apiFetch<{ image: string }>(`/api/admin/pros/${proId}/products/photo`, {
    method: "POST",
    body: { productId, contentType: file.type, imageBase64 },
  });
  return data.image;
}

export interface AdminResetMenuResult {
  deletedCount: number;
  keptCount: number;
  kept: { id: string; name: string }[];
}

/**
 * POST /api/admin/pros/:proId/products/reset — supprime tous les produits
 * d'un Pro (nettoyage avant réimport CSV propre, ex: doublons/accents
 * corrompus d'un import raté). Un produit déjà commandé ou ayant reçu un
 * avis ne peut pas être supprimé (contrainte serveur) — il reste tel quel,
 * voir `kept` dans le résultat.
 */
export async function resetAdminProProducts(proId: string): Promise<AdminResetMenuResult> {
  return apiFetch<AdminResetMenuResult>(`/api/admin/pros/${proId}/products/reset`, {
    method: "POST",
  });
}

export interface AdminSetImagesResult {
  updatedCount: number;
  unmatched: string[];
  ambiguous: string[];
}

/**
 * POST /api/admin/pros/:proId/products/set-images — renseigne la photo
 * (Product.image) d'un lot de produits déjà existants, retrouvés par leur
 * nom exact (insensible à la casse/espaces). Complète un import CSV qui ne
 * gère pas encore les images, sans y toucher — voir AdminImportMenuModal.
 */
export async function setAdminProductImages(
  proId: string,
  images: { productName: string; imageUrl: string }[]
): Promise<AdminSetImagesResult> {
  return apiFetch<AdminSetImagesResult>(`/api/admin/pros/${proId}/products/set-images`, {
    method: "POST",
    body: { images },
  });
}

export interface AdminImportMenuResult {
  importedCount: number;
  productNames: string[];
}

/**
 * POST /api/admin/pros/:proId/products/import — import CSV manuel d'un
 * menu complet (produits + groupes d'options + choix) pour un Pro, sans
 * passer par son compte. Réservé SUPER_ADMIN côté serveur.
 */
export async function importAdminMenuCsv(proId: string, csv: string): Promise<AdminImportMenuResult> {
  return apiFetch<AdminImportMenuResult>(`/api/admin/pros/${proId}/products/import`, {
    method: "POST",
    body: { csv },
  });
}

export interface ProPauseState {
  id: string;
  businessName: string;
  isPausedByAdmin: boolean;
  adminPauseNote: string | null;
}

/**
 * GET /api/admin/pros/:proId/pause — état actuel de la pause "test" admin
 * (distincte de la fermeture manuelle du Pro — voir la route serveur pour
 * le détail). Route autonome, ne fait pas partie de AdminProRow.
 */
export async function fetchProPauseState(proId: string): Promise<ProPauseState> {
  return apiFetch<ProPauseState>(`/api/admin/pros/${proId}/pause`);
}

/** PATCH /api/admin/pros/:proId/pause — active/désactive la pause "test" admin. Réservé ADMIN/SUPER_ADMIN. */
export async function setProPauseState(proId: string, isPausedByAdmin: boolean, adminPauseNote?: string | null): Promise<ProPauseState> {
  return apiFetch<ProPauseState>(`/api/admin/pros/${proId}/pause`, {
    method: "PATCH",
    body: { isPausedByAdmin, adminPauseNote },
  });
}

interface FetchUsersParams {
  role?: string;
  search?: string;
}

/** GET /api/admin/users */
export async function fetchAdminUsers(params: FetchUsersParams = {}): Promise<User[]> {
  const query = new URLSearchParams();
  if (params.role) query.set("role", params.role);
  if (params.search) query.set("search", params.search);
  const search = query.toString();
  const data = await apiFetch<{ users: User[] }>(`/api/admin/users${search ? `?${search}` : ""}`);
  return data.users;
}

export interface UpdateAdminUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: User["role"];
  status?: User["status"];
}

/** PATCH /api/admin/users/:userId */
export async function updateAdminUser(userId: string, payload: UpdateAdminUserPayload): Promise<User> {
  return apiFetch<User>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/**
 * DELETE /api/admin/users/[userId]
 *
 * Suppression définitive — refusée par l'API (409) si le compte a un
 * historique de commandes lié, voir le message renvoyé dans ce cas.
 *
 * Timeout allongé à 30s (au lieu des 15s par défaut) : cette suppression
 * passe par Supabase Auth, dont le trigger cascade vers nos tables métier
 * (Client/Pro/Rider/Address/Notification) — plus lent qu'un appel API
 * classique, et 15s coupait parfois la requête avant qu'elle n'aboutisse
 * ("signal is aborted without reason" côté écran, alors que la suppression
 * elle-même n'avait pas forcément échoué côté serveur).
 */
export async function deleteAdminUser(userId: string): Promise<void> {
  await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE", timeoutMs: 30000 });
}

export interface AdminProRow extends Omit<Pro, "addresses" | "user"> {
  user: Pick<User, "firstName" | "lastName" | "email" | "phone">;
  addresses: Address[];
  _count: { orders: number };
}

/** GET /api/admin/pros */
export async function fetchAdminPros(): Promise<AdminProRow[]> {
  const data = await apiFetch<{ pros: AdminProRow[] }>("/api/admin/pros");
  return data.pros;
}

export interface AdminRiderRow extends Omit<Rider, "user"> {
  user: Pick<User, "firstName" | "lastName" | "email" | "phone">;
}

/** GET /api/admin/riders */
export async function fetchAdminRiders(): Promise<AdminRiderRow[]> {
  const data = await apiFetch<{ riders: AdminRiderRow[] }>("/api/admin/riders");
  return data.riders;
}

export interface UpdateAdminRiderPayload {
  vehicleType?: Rider["vehicleType"];
  vehiclePlate?: string | null;
  status?: Rider["status"];
}

/** PATCH /api/admin/riders/:riderId */
export async function updateAdminRider(riderId: string, payload: UpdateAdminRiderPayload): Promise<AdminRiderRow> {
  const data = await apiFetch<{ rider: AdminRiderRow }>(`/api/admin/riders/${riderId}`, {
    method: "PATCH",
    body: payload,
  });
  return data.rider;
}

export interface UpdateAdminProPayload {
  businessName?: string;
  legalName?: string | null;
  legalForm?: string | null;
  vatNumber?: string | null;
  managerFirstName?: string | null;
  managerLastName?: string | null;
  phone?: string;
  emailContact?: string;
  category?: Pro["category"];
  status?: Pro["status"];
}

/** PATCH /api/admin/pros/:proId */
export async function updateAdminPro(proId: string, payload: UpdateAdminProPayload): Promise<AdminProRow> {
  const data = await apiFetch<{ pro: AdminProRow }>(`/api/admin/pros/${proId}`, {
    method: "PATCH",
    body: payload,
  });
  return data.pro;
}

/** GET /api/admin/riders/:riderId/reviews */
export async function fetchAdminRiderReviews(riderId: string): Promise<Review[]> {
  const data = await apiFetch<{ reviews: Review[] }>(`/api/admin/riders/${riderId}/reviews`);
  return data.reviews;
}

/** GET /api/admin/pros/:proId/reviews */
export async function fetchAdminProReviews(proId: string): Promise<Review[]> {
  const data = await apiFetch<{ reviews: Review[] }>(`/api/admin/pros/${proId}/reviews`);
  return data.reviews;
}

/**
 * GET /api/admin/reviews/platform — avis clients sur l'application Do You
 * Geckoo elle-même (volet `platform` de Review, indépendant des avis
 * commerçant/livreur).
 */
export async function fetchAdminPlatformReviews(): Promise<Review[]> {
  const data = await apiFetch<{ reviews: Review[] }>("/api/admin/reviews/platform");
  return data.reviews;
}

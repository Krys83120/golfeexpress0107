import { apiFetch } from "@/services/apiClient";
import type { Product, ProductOption } from "@golfeexpress/types";

/** GET /api/pros/me/products — tous les produits (y compris non disponibles). */
export async function fetchMyProducts(): Promise<Product[]> {
  const data = await apiFetch<{ products: Product[] }>("/api/pros/me/products");
  return data.products;
}

type CreateProductInput = Omit<Product, "id" | "proId">;

/** POST /api/pros/me/products */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const data = await apiFetch<{ product: Product }>("/api/pros/me/products", { method: "POST", body: input });
  return data.product;
}

/** PATCH /api/pros/me/products/[productId] */
export async function updateProduct(productId: string, updates: Partial<CreateProductInput>): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(`/api/pros/me/products/${productId}`, {
    method: "PATCH",
    body: updates,
  });
  return data.product;
}

/** DELETE /api/pros/me/products/[productId] */
export async function deleteProductApi(productId: string): Promise<void> {
  await apiFetch(`/api/pros/me/products/${productId}`, { method: "DELETE" });
}

export type OptionGroupInput = Pick<ProductOption, "name" | "isRequired" | "isMultiple" | "maxChoices"> & {
  /**
   * Groupe conditionnel : référence un choix d'un groupe précédent par
   * POSITION dans le tableau `options` envoyé (jamais par id -- voir
   * ProductFormModal.tsx et options/route.ts pour la résolution position ->
   * id côté serveur). null = groupe toujours affiché.
   */
  dependsOn: { groupIndex: number; choiceIndex: number } | null;
  choices: {
    name: string;
    priceModifier: number;
    /** Rupture sur ce choix précis (ex: "plus de mâche"). Voir ProductFormModal.tsx. */
    isAvailable: boolean;
    unavailableUntil: string | null;
    /** Le client peut ajouter ce choix plusieurs fois (ex: "Bacon" x4). Voir ProductFormModal.tsx. */
    allowMultipleQty: boolean;
  }[];
};

/**
 * PUT /api/pros/me/products/[productId]/options — remplace intégralement les
 * options du produit, et met à jour au passage les deux réglages du produit
 * affichés au même endroit dans ProductFormModal.tsx (allowSpecialInstructions,
 * hasExtraFeeNotice) -- omis (undefined) = inchangés côté serveur.
 */
export async function updateProductOptions(
  productId: string,
  options: OptionGroupInput[],
  settings?: { allowSpecialInstructions?: boolean; hasExtraFeeNotice?: boolean }
): Promise<Product> {
  const data = await apiFetch<{ product: Product }>(`/api/pros/me/products/${productId}/options`, {
    method: "PUT",
    body: { options, ...settings },
  });
  return data.product;
}

/** PATCH /api/pros/me/products/rename-category — renomme (ou fusionne) une catégorie sur tous les produits concernés. */
export async function renameProductCategory(oldName: string, newName: string): Promise<number> {
  const data = await apiFetch<{ updatedCount: number }>("/api/pros/me/products/rename-category", {
    method: "PATCH",
    body: { oldName, newName },
  });
  return data.updatedCount;
}

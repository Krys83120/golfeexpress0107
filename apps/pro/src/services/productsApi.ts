import { apiFetch } from "@/services/apiClient";
import type { Product } from "@golfeexpress/types";

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

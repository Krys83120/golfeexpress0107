import { apiFetch } from "@/services/apiClient";

export interface StockOptionChoice {
  id: string;
  name: string;
  isAvailable: boolean;
  unavailableUntil: string | null;
}

export interface StockOptionGroup {
  id: string;
  name: string;
  choices: StockOptionChoice[];
}

export interface StockProduct {
  id: string;
  name: string;
  category: string;
  image: string | null;
  isAvailable: boolean;
  unavailableUntil: string | null;
  options: StockOptionGroup[];
}

/** GET /api/pros/me/stock -- accessible au patron ET à l'employé (voir requireProOrEmployee côté API). */
export async function fetchStock(): Promise<StockProduct[]> {
  const data = await apiFetch<{ products: StockProduct[] }>("/api/pros/me/stock");
  return data.products;
}

export type StockTargetType = "product" | "optionChoice";

/**
 * PATCH /api/pros/me/stock -- coche/décoche la rupture d'un produit ou d'un
 * choix d'option précis. Quand l'appelant est un compte employé, le patron
 * est alerté automatiquement côté serveur (email à la mise en rupture,
 * notification au retour en stock) -- rien à gérer de plus ici.
 */
export async function setStockAvailability(
  targetType: StockTargetType,
  targetId: string,
  isAvailable: boolean
): Promise<void> {
  await apiFetch("/api/pros/me/stock", {
    method: "PATCH",
    body: { targetType, targetId, isAvailable },
  });
}

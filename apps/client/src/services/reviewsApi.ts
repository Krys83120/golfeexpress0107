import { apiFetch } from "@/services/apiClient";
import type { Review, ProductReview } from "@golfeexpress/types";

interface ReviewTargetInput {
  rating: number;
  comment?: string;
}

export interface ProductReviewInput {
  productId: string;
  rating: number;
  comment?: string;
}

/**
 * Chaque cible est optionnelle et indépendante -- le client note ce qu'il
 * veut (uniquement le livreur, uniquement le commerçant, un produit précis,
 * tout, ou toute combinaison), jamais un seul avis dupliqué partout. Voir
 * POST /api/orders/[orderId]/review.
 */
export interface CreateReviewInput {
  pro?: ReviewTargetInput;
  rider?: ReviewTargetInput;
  platform?: ReviewTargetInput;
  products?: ProductReviewInput[];
}

export interface OrderReviewResponse {
  review: Review | null;
  productReviews: ProductReview[];
}

/** POST /api/orders/[orderId]/review */
export async function createReview(orderId: string, input: CreateReviewInput): Promise<OrderReviewResponse> {
  return apiFetch<OrderReviewResponse>(`/api/orders/${orderId}/review`, {
    method: "POST",
    body: input,
  });
}

/** GET /api/orders/[orderId]/review — renvoie l'avis existant (review + productReviews), vides si la commande n'a pas encore été notée. */
export async function fetchOrderReview(orderId: string): Promise<OrderReviewResponse> {
  return apiFetch<OrderReviewResponse>(`/api/orders/${orderId}/review`);
}

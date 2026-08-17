import { apiFetch } from "@/services/apiClient";
import type { Review } from "@golfeexpress/types";

export interface CreateReviewInput {
  productRating: number;
  proRating: number;
  riderRating?: number;
  platformRating: number;
  comment?: string;
}

/** POST /api/orders/[orderId]/review */
export async function createReview(orderId: string, input: CreateReviewInput): Promise<Review> {
  const data = await apiFetch<{ review: Review }>(`/api/orders/${orderId}/review`, {
    method: "POST",
    body: input,
  });
  return data.review;
}

/** GET /api/orders/[orderId]/review — renvoie l'avis existant, ou null si la commande n'a pas encore été notée. */
export async function fetchOrderReview(orderId: string): Promise<Review | null> {
  const data = await apiFetch<{ review: Review | null }>(`/api/orders/${orderId}/review`);
  return data.review;
}
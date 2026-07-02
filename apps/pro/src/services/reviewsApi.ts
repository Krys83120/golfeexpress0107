import { apiFetch } from "@/services/apiClient";
import type { Review } from "@golfeexpress/types";

/** GET /api/pros/me/reviews */
export async function fetchMyReviews(): Promise<Review[]> {
  const data = await apiFetch<{ reviews: Review[] }>("/api/pros/me/reviews");
  return data.reviews;
}

/** POST /api/pros/me/reviews/[reviewId]/reply */
export async function replyToReview(reviewId: string, reply: string): Promise<Review> {
  const data = await apiFetch<{ review: Review }>(`/api/pros/me/reviews/${reviewId}/reply`, {
    method: "POST",
    body: { reply },
  });
  return data.review;
}

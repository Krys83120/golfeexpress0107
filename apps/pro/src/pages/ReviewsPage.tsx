import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import type { Review } from "@golfeexpress/types";
import { fetchMyReviews, replyToReview } from "@/services/reviewsApi";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} fill={i <= rating ? "#FF6B35" : "none"} color={i <= rating ? "#FF6B35" : "#E5E7EB"} />
      ))}
    </div>
  );
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [draftReply, setDraftReply] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  async function load() {
    setStatus("loading");
    try {
      const data = await fetchMyReviews();
      setReviews(data);
      setStatus("loaded");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les avis.");
      setStatus("error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSendReply(reviewId: string) {
    if (!draftReply.trim()) return;
    setSubmittingReply(true);
    try {
      const updated = await replyToReview(reviewId, draftReply.trim());
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      setReplyingTo(null);
      setDraftReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer la réponse.");
    } finally {
      setSubmittingReply(false);
    }
  }

  const average = reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.proRating ?? 0), 0) / reviews.length : 0;
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) if (r.proRating) distribution[r.proRating] = (distribution[r.proRating] ?? 0) + 1;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-nuit">Avis clients</h1>
        <p className="text-sm text-gris">Ce que vos clients pensent de vous</p>
      </div>

      {status === "error" && (
        <div className="mb-6 rounded-sm bg-red-50 p-4 text-sm text-red-500">
          {error}{" "}
          <button onClick={load} className="font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {status === "loading" && reviews.length === 0 ? (
        <p className="py-12 text-center text-sm text-gris">Chargement des avis...</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              <p className="font-heading text-4xl font-extrabold text-nuit">{average.toFixed(1)}</p>
              <Stars rating={Math.round(average)} />
              <p className="mt-1 text-sm text-gris">{reviews.length} avis</p>
            </div>

            <div className="sm:col-span-2 rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = distribution[star] ?? 0;
                const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="mb-1.5 flex items-center gap-3">
                    <span className="w-3 text-xs text-gris">{star}</span>
                    <Star size={11} fill="#FF6B35" color="#FF6B35" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gris-light">
                      <div className="h-full rounded-full bg-corail" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs text-gris">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {reviews.length === 0 ? (
            <p className="py-12 text-center text-sm text-gris">Aucun avis pour le moment.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((review) => {
                const clientName = review.client?.user
                  ? `${review.client.user.firstName} ${review.client.user.lastName}`
                  : "Client";
                return (
                  <div key={review.id} className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gris-light text-sm font-bold text-nuit">
                          {clientName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-nuit">{clientName}</p>
                          <p className="text-xs text-gris">
                            {new Date(review.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                          </p>
                        </div>
                      </div>
                      <Stars rating={review.proRating ?? 0} />
                    </div>

                    {review.proComment && <p className="mb-3 text-sm text-nuit">{review.proComment}</p>}

                    {review.proReply ? (
                      <div className="rounded-sm bg-gris-light p-3">
                        <p className="mb-1 text-xs font-semibold text-golfe-green">Votre réponse</p>
                        <p className="text-sm text-nuit">{review.proReply}</p>
                      </div>
                    ) : replyingTo === review.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={draftReply}
                          onChange={(e) => setDraftReply(e.target.value)}
                          placeholder="Répondre à cet avis..."
                          rows={2}
                          className="w-full rounded-sm border border-gris-light px-3 py-2 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="rounded-sm border border-gris-light px-3 py-1.5 text-xs font-semibold text-gris"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleSendReply(review.id)}
                            disabled={submittingReply || !draftReply.trim()}
                            className="rounded-sm bg-golfe-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            {submittingReply ? "Envoi..." : "Envoyer"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setReplyingTo(review.id);
                          setDraftReply("");
                        }}
                        className="text-xs font-semibold text-golfe-green"
                      >
                        Répondre à cet avis
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

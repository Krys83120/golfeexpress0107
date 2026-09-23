import { prisma } from "@/lib/prisma";
import { ApiError } from "@/middleware/auth";

interface RateLimitOptions {
  /** Identifiant de la route (ex: "login", "forgot-password") -- préfixe de la clé, pour isoler les compteurs entre routes même si une IP tape sur plusieurs endpoints. */
  route: string;
  /** Nombre de requêtes autorisées par fenêtre. */
  limit: number;
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number;
}

/**
 * Extrait l'IP réelle du visiteur. Vercel/Next.js ne fournit pas de `req.ip`
 * sur les Route Handlers App Router -- l'IP transite via le header
 * `x-forwarded-for`, injecté par l'infra Vercel (jamais falsifiable par le
 * client : Vercel écrase ce header en amont plutôt que de le faire suivre
 * tel quel). On prend la première valeur de la liste (le visiteur réel, les
 * éventuels proxys suivants s'ajoutant après).
 */
function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Rate limiting basique par IP (23/09/2026, suite à l'audit sécurité demandé
 * par Krys) -- protège les endpoints publics sensibles (login, signup,
 * forgot-password, contact) contre le bourrinage/spam. Stocké en base
 * (table rate_limit_hits, voir prisma/schema.prisma model RateLimitHit)
 * plutôt qu'en mémoire : les fonctions serverless Vercel n'ont pas d'état
 * partagé entre invocations (chaque appel peut atterrir sur une instance
 * différente), un compteur en mémoire serait donc systématiquement
 * réinitialisé et totalement inefficace.
 *
 * Upsert atomique en une seule requête SQL (ON CONFLICT) pour éviter toute
 * race condition entre deux requêtes concurrentes de la même IP -- deux
 * requêtes lues/écrites séparément (lecture puis écriture) pourraient sinon
 * toutes les deux lire "count=3" et repartir de là, laissant passer plus de
 * requêtes que la limite réelle.
 *
 * À appeler en tout début de handler, avant toute opération coûteuse :
 *   await enforceRateLimit(req, { route: "login", limit: 10, windowMs: 15 * 60 * 1000 });
 * Lève une ApiError(429) si la limite est dépassée -- catchée comme
 * n'importe quelle ApiError par withErrorHandling (voir middleware/auth.ts).
 */
export async function enforceRateLimit(req: Request, options: RateLimitOptions): Promise<void> {
  const ip = getClientIp(req);
  const key = `${options.route}:${ip}`;
  const resetAt = new Date(Date.now() + options.windowMs);

  const rows = await prisma.$queryRaw<{ count: number; reset_at: Date }[]>`
    INSERT INTO "rate_limit_hits" (key, count, reset_at)
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN "rate_limit_hits".reset_at < NOW() THEN 1 ELSE "rate_limit_hits".count + 1 END,
      reset_at = CASE WHEN "rate_limit_hits".reset_at < NOW() THEN ${resetAt} ELSE "rate_limit_hits".reset_at END
    RETURNING count, reset_at
  `;

  const current = rows[0];
  if (current && current.count > options.limit) {
    throw new ApiError(429, "Trop de tentatives. Merci de réessayer dans quelques minutes.");
  }
}

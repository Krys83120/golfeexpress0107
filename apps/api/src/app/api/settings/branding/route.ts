import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Sans ça, Next.js traite ce handler GET comme STATIQUE (exécuté une
// seule fois au moment du build, réponse figée définitivement) puisqu'il
// ne lit aucune donnée "dynamique" explicite (pas de cookies/headers/
// searchParams). Ça a fait passer inaperçu un bug pendant un moment : une
// valeur déjà correcte au moment du build (logoUrl) semblait fonctionner
// "en direct", alors qu'en réalité c'était juste une coïncidence — toute
// mise à jour ultérieure (wwwLogoUrl) restait bloquée à sa valeur figée
// au build, quoi qu'on fasse côté cache HTTP/CDN.
export const dynamic = "force-dynamic";

/**
 * GET /api/settings/branding
 *
 * Route PUBLIQUE (aucune auth) — contrairement à /api/admin/settings qui
 * expose tous les GlobalSetting et nécessite un rôle Admin. Les écrans de
 * connexion/chargement des 3 apps (Client/Livreur/Pro) l'appellent AVANT
 * que la personne soit connectée, donc l'auth y est impossible. Le site
 * vitrine (www) l'appelle aussi, côté serveur, pour son propre logo
 * (wwwLogoUrl), volontairement distinct et indépendant de celui des apps.
 *
 * On expose ici volontairement une liste blanche minimaliste (juste
 * logoUrl/wwwLogoUrl) plutôt que de rendre /api/admin/settings public.
 */
export async function GET() {
  const [logoSetting, wwwLogoSetting, wwwOgTextSetting] = await Promise.all([
    prisma.globalSetting.findUnique({ where: { key: "branding.logo_url" } }),
    prisma.globalSetting.findUnique({ where: { key: "branding.www_logo_url" } }),
    prisma.globalSetting.findUnique({ where: { key: "seo.www_og_text" } }),
  ]);

  function extractUrl(setting: typeof logoSetting): string | null {
    return setting && typeof setting.value === "object" && setting.value !== null && "url" in (setting.value as any)
      ? (setting.value as { url: string }).url
      : null;
  }

  // Titre/description utilisés pour l'aperçu de partage (WhatsApp/iMessage/
  // Facebook...) du site vitrine — éditables depuis Admin > SEO/GEO, avec
  // repli sur null si jamais configurés (le site vitrine garde alors ses
  // valeurs par défaut codées en dur dans layout.tsx).
  const wwwOgText =
    wwwOgTextSetting &&
    typeof wwwOgTextSetting.value === "object" &&
    wwwOgTextSetting.value !== null &&
    "title" in (wwwOgTextSetting.value as any) &&
    "description" in (wwwOgTextSetting.value as any)
      ? (wwwOgTextSetting.value as { title: string; description: string })
      : null;

  return NextResponse.json(
    { logoUrl: extractUrl(logoSetting), wwwLogoUrl: extractUrl(wwwLogoSetting), wwwOgText },
    // Cache court côté CDN/navigateur — le logo ne change pas souvent,
    // mais on veut qu'une mise à jour depuis l'Admin se propage sans
    // attendre trop longtemps non plus.
    { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } }
  );
}

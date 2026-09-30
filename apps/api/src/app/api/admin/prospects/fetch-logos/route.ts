import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/prospects/fetch-logos
 *
 * Recherche automatique d'un logo pour chaque prospect qui n'en a pas
 * encore (logoUrl=null), affiché ensuite sur l'annuaire public
 * /decouvrir/[ville] -- ajout du 30/09/2026, demande de Krys juste après
 * la mise en ligne de cet annuaire ("recherche moi tous les logos et
 * affecte les").
 *
 * Source UNIQUE : le site web du prospect (websiteUrl). On n'essaie
 * jamais Facebook ni Google Maps : Facebook exige une session pour la
 * quasi-totalité de son contenu aujourd'hui, et Google Maps est une appli
 * JS qui ne renvoie rien d'exploitable en HTML brut -- un essai y
 * coûterait du temps pour un taux de réussite proche de zéro.
 *
 * Repérage sur la page HTML du site, dans cet ordre (on s'arrête au
 * premier trouvé) :
 *  1. <link rel="apple-touch-icon" ...> -- le plus souvent une vraie icône
 *     carrée pensée pour être affichée petite, exactement notre usage ici
 *     (contrairement à og:image, en général une photo large/paysage qui
 *     rendrait mal recadrée en carré).
 *  2. <link rel="icon"|"shortcut icon" ...>
 *  3. <meta property="og:image" content="...">
 *  4. /favicon.ico à la racine du site, même sans balise déclarée --
 *     convention assez répandue pour valoir un essai avant d'abandonner.
 * Rien de trouvé = logoUrl reste null = repli sur le badge générique Do
 * You Geckoo (même comportement qu'aujourd'hui, jamais une image cassée).
 *
 * On ne touche qu'aux prospects qui apparaîtraient réellement sur
 * /decouvrir/[ville] (même filtre que GET /api/prospects) -- inutile de
 * dépenser du temps/de la bande passante sur des fiches qui ne
 * s'afficheront de toute façon jamais côté public.
 *
 * Tous les sites sont interrogés EN PARALLÈLE (Promise.allSettled, timeout
 * court par site) : une boucle séquentielle sur potentiellement une
 * centaine de prospects dépasserait largement le temps d'exécution
 * autorisé pour une fonction Vercel. Le fetch réseau n'étant pas
 * bloquant pour la boucle d'événements Node, le temps total reste borné
 * par le site le plus lent, pas par la somme de tous les sites.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FETCH_TIMEOUT_MS = 6000;
const FAVICON_TIMEOUT_MS = 4000;
const USER_AGENT = "Mozilla/5.0 (compatible; DoYouGeckooBot/1.0; +https://www.doyougeckoo.fr)";

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "User-Agent": USER_AGENT } });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrl(maybeRelative: string, base: string): string | null {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

function extractAttr(tag: string, attr: string): string | null {
  const match = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
  return match ? match[1] : null;
}

function extractLogoFromHtml(html: string, baseUrl: string): string | null {
  const appleTouchTag = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]*>/i)?.[0];
  const appleTouchHref = appleTouchTag ? extractAttr(appleTouchTag, "href") : null;
  if (appleTouchHref) {
    const resolved = resolveUrl(appleTouchHref, baseUrl);
    if (resolved) return resolved;
  }

  const iconTag = html.match(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]*>/i)?.[0];
  const iconHref = iconTag ? extractAttr(iconTag, "href") : null;
  if (iconHref) {
    const resolved = resolveUrl(iconHref, baseUrl);
    if (resolved) return resolved;
  }

  const ogTag = html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i)?.[0];
  const ogContent = ogTag ? extractAttr(ogTag, "content") : null;
  if (ogContent) {
    const resolved = resolveUrl(ogContent, baseUrl);
    if (resolved) return resolved;
  }

  return null;
}

async function findLogoForWebsite(websiteUrl: string): Promise<string | null> {
  const res = await fetchWithTimeout(websiteUrl, FETCH_TIMEOUT_MS);
  if (res && res.ok) {
    const html = await res.text().catch(() => "");
    const found = extractLogoFromHtml(html, websiteUrl);
    if (found) return found;
  }

  try {
    const root = new URL(websiteUrl);
    const faviconUrl = `${root.protocol}//${root.host}/favicon.ico`;
    const faviconRes = await fetchWithTimeout(faviconUrl, FAVICON_TIMEOUT_MS);
    if (faviconRes && faviconRes.ok) {
      const contentType = faviconRes.headers.get("content-type") ?? "";
      if (contentType.startsWith("image/")) return faviconUrl;
    }
  } catch {
    // websiteUrl mal formée -- rien de plus à tenter
  }

  return null;
}

async function postHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const candidates = await prisma.prospect.findMany({
    where: {
      logoUrl: null,
      websiteUrl: { not: null },
      showOnDirectory: true,
      convertedAt: null,
      OR: [{ offersTakeaway: true }, { advertisesUberEats: true }],
    },
    select: { id: true, websiteUrl: true },
  });

  const results = await Promise.allSettled(
    candidates.map(async (c) => ({ id: c.id, logoUrl: await findLogoForWebsite(c.websiteUrl as string) }))
  );

  const found = results
    .filter(
      (r): r is PromiseFulfilledResult<{ id: string; logoUrl: string | null }> =>
        r.status === "fulfilled" && r.value.logoUrl !== null
    )
    .map((r) => r.value as { id: string; logoUrl: string });

  if (found.length > 0) {
    await prisma.$transaction(
      found.map((f) => prisma.prospect.update({ where: { id: f.id }, data: { logoUrl: f.logoUrl } }))
    );
  }

  return NextResponse.json({
    checked: candidates.length,
    found: found.length,
    notFound: candidates.length - found.length,
  });
}

export const POST = withErrorHandling(postHandler);

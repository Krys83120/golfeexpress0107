import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Même raison que /api/settings/branding : sans ça Next.js figerait la
// réponse au build, et un partenaire ajouté depuis l'Admin n'apparaîtrait jamais.
export const dynamic = "force-dynamic";

const SETTING_KEY = "footer.partners";

interface FooterPartner {
  id: string;
  name: string;
  url: string;
  logoUrl: string;
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\/[^\s]+$/i.test(value);
}

/**
 * GET /api/settings/footer-partners
 *
 * Route PUBLIQUE (aucune auth) : liste des partenaires affichés dans le pied
 * de page du site vitrine (www), gérée depuis Admin > Branding. On ne renvoie
 * que des entrées complètes et dont les liens sont en http(s) (jamais de
 * "javascript:" ou autre schéma), même si la valeur stockée est incorrecte.
 */
export async function GET() {
  const setting = await prisma.globalSetting.findUnique({ where: { key: SETTING_KEY } });

  const rawItems =
    setting && typeof setting.value === "object" && setting.value !== null && "items" in (setting.value as any)
      ? (setting.value as { items: unknown }).items
      : [];

  const partners: FooterPartner[] = (Array.isArray(rawItems) ? rawItems : [])
    .filter(
      (item: any) =>
        item &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        item.name.trim() !== "" &&
        isHttpUrl(item.url) &&
        isHttpUrl(item.logoUrl)
    )
    .map((item: any) => ({ id: item.id, name: item.name.trim(), url: item.url, logoUrl: item.logoUrl }));

  return NextResponse.json(
    { partners },
    { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } }
  );
}

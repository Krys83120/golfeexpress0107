import { prisma } from "@/lib/prisma";

/**
 * Récupère le logo carré global de la plateforme (GlobalSetting
 * "branding.logo_url" — le même logo que celui affiché dans la barre
 * latérale de l'app Pro, à ne pas confondre avec "branding.www_logo_url"
 * qui est réservé au site vitrine, voir /api/settings/branding) et
 * retourne ses octets bruts, prêts à être passés à doc.image() (pdfkit
 * sait embarquer nativement du PNG/JPEG).
 *
 * Retourne `null` en cas d'absence de logo configuré OU d'échec de
 * téléchargement/format non supporté — un ticket ou un rapport Z sans
 * logo reste un document valide : on ne veut jamais faire échouer toute
 * la génération PDF à cause d'un logo indisponible ou dans un format que
 * pdfkit ne sait pas lire (SVG, WebP...).
 */
export async function loadLogoImage(): Promise<Buffer | null> {
  try {
    const setting = await prisma.globalSetting.findUnique({ where: { key: "branding.logo_url" } });
    const url =
      setting && typeof setting.value === "object" && setting.value !== null && "url" in (setting.value as any)
        ? (setting.value as { url: string }).url
        : null;
    if (!url) return null;

    const res = await fetch(url);
    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[PDF][logo] Impossible de charger le logo de la plateforme :", err);
    return null;
  }
}

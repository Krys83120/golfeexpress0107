import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/settings/branding
 *
 * Route PUBLIQUE (aucune auth) — contrairement à /api/admin/settings qui
 * expose tous les GlobalSetting et nécessite un rôle Admin. Les écrans de
 * connexion/chargement des 3 apps (Client/Livreur/Pro) l'appellent AVANT
 * que la personne soit connectée, donc l'auth y est impossible.
 *
 * On expose ici volontairement une liste blanche minimaliste (juste
 * logoUrl) plutôt que de rendre /api/admin/settings public — voir le TODO
 * déjà présent dans ce fichier historiquement.
 */
export async function GET() {
  const setting = await prisma.globalSetting.findUnique({ where: { key: "branding.logo_url" } });
  const logoUrl = setting && typeof setting.value === "object" && setting.value !== null && "url" in (setting.value as any)
    ? (setting.value as { url: string }).url
    : null;

  return NextResponse.json(
    { logoUrl },
    // Cache très court : on privilégie la fraîcheur ("en direct, sans
    // redéploiement" promis dans l'UI Admin) à la charge serveur — cette
    // route est légère et appelée seulement au chargement des écrans de
    // connexion, pas à chaque interaction.
    { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" } }
  );
}

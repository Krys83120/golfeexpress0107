import { NextRequest, NextResponse } from "next/server";
import sitemap from "@/app/sitemap";
import { submitIndexNow } from "@/lib/indexNow";

export const dynamic = "force-dynamic";

/**
 * Resoumet TOUTES les URLs actuelles du sitemap à IndexNow (ajout du
 * 03/10/2026, demande de Krys). Un seul appel couvre tous les types de
 * contenu (nouveaux Commerçants actifs, nouveaux articles de blog, nouvelles
 * villes) sans avoir à cabler un déclenchement séparé dans chaque endroit du
 * backend qui "publie" quelque chose -- on réutilise directement la même
 * logique que /sitemap.xml, donc toujours cohérent avec ce que Google/Bing
 * voient déjà par ailleurs.
 *
 * Déclenché par :
 * - une tâche planifiée quotidienne (voir le scheduler Claude) ;
 * - Krys manuellement si besoin (GET avec le bon ?token=).
 *
 * TOKEN volontairement simple (pas une vraie clé API) : seul effet d'un
 * appel non autorisé = une resoumission inutile de nos propres URLs
 * publiques à IndexNow, aucune donnée sensible exposée.
 */
const SUBMIT_TOKEN = "b2e8ec17e693918cc7e2f221";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== SUBMIT_TOKEN) {
    return NextResponse.json({ error: "Token invalide." }, { status: 401 });
  }

  const entries = await sitemap();
  const urls = entries.map((e) => e.url);
  const result = await submitIndexNow(urls);

  return NextResponse.json({
    submitted: result.urlCount,
    indexNowStatus: result.status,
    ok: result.ok,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { ApiError, requireAuth, withErrorHandling } from "@/middleware/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/storage/signed-upload
 *
 * Délivre un jeton d'upload à usage unique vers le bucket PUBLIC
 * "branding-assets" (logos, favicons, splash, images de partage OpenGraph).
 *
 * Pourquoi (04/10/2026, durcissement Storage) : jusqu'ici l'admin écrivait
 * dans ce bucket avec la clé anon, ce qui obligeait à laisser des policies
 * INSERT/UPDATE/DELETE ouvertes à tout le monde ("public"). Désormais,
 * l'admin demande ici un jeton (réservé ADMIN/SUPER_ADMIN) puis envoie le
 * fichier directement à Supabase avec ce jeton : aucune policy d'écriture
 * publique n'est plus nécessaire, et le fichier ne transite pas par Vercel
 * (limite de 4,5 Mo par requête).
 *
 * Body : { path: "logo-admin.png" }  -- uniquement des noms de fichiers
 * attendus par Admin > Branding (liste blanche ci-dessous).
 * Réponse 200 : { path, token }
 */
const BUCKET = "branding-assets";

const APPS = "(?:admin|pro|commander|livreur)";
const OG_APPS = "(?:commander|livreur|pro|www)";
const EXT = "(?:png|jpe?g|webp|svg|gif)";

const ALLOWED_PATH_PATTERNS: RegExp[] = [
  new RegExp(`^logo-${APPS}\\.${EXT}$`, "i"),
  new RegExp(`^www-logo\\.${EXT}$`, "i"),
  new RegExp(`^splash-${APPS}\\.${EXT}$`, "i"),
  new RegExp(`^splash-runner-${APPS}\\.${EXT}$`, "i"),
  new RegExp(`^og-bg-${OG_APPS}\\.${EXT}$`, "i"),
  new RegExp(`^og-${OG_APPS}\\.png$`, "i"),
];

const bodySchema = z.object({ path: z.string().min(3).max(100) });

async function postHandler(req: NextRequest) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "Chemin de fichier manquant ou invalide.");
  }

  const { path } = parsed.data;
  if (!ALLOWED_PATH_PATTERNS.some((re) => re.test(path))) {
    throw new ApiError(400, "Nom de fichier non autorisé pour ce bucket.");
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    console.error("[API] createSignedUploadUrl:", error);
    throw new ApiError(500, "Impossible de préparer l'upload.");
  }

  return NextResponse.json({ path: data.path, token: data.token });
}

export const POST = withErrorHandling(postHandler);

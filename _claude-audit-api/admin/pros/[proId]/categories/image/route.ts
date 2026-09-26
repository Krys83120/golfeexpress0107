import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo, cohérent avec apps/pro/src/services/uploadsApi.ts
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const bodySchema = z.object({
  category: z.string().min(1, "Catégorie manquante."),
  contentType: z.string().refine((t) => t in ALLOWED_TYPES, "Format non supporté (JPEG, PNG ou WebP uniquement)."),
  // Image encodée en base64 (sans le préfixe "data:...;base64,") -- envoyée
  // en JSON plutôt qu'en multipart pour réutiliser apiFetch tel quel côté
  // admin (voir adminEntitiesApi.ts), sans lui ajouter de chemin multipart
  // dédié pour cette seule route.
  imageBase64: z.string().min(1, "Image manquante."),
});

/**
 * POST /api/admin/pros/[proId]/categories/image
 *
 * Upload la photo d'UNE catégorie de menu (vignette côté app Client, voir
 * ProDetailScreen.tsx) -- "ajouter ou pas" une photo est volontairement
 * optionnel (voir AdminCategoryManagerModal.tsx) : sans photo choisie ici,
 * la vignette retombe sur la photo d'un produit puis sur un emoji (voir
 * categoryTilePhoto côté Client). Utilise supabaseAdmin (clé service_role,
 * bypass RLS) pour écrire dans le bucket Storage existant "product-images"
 * sans exiger de nouvelle policy -- chemin "{proId}/category-{slug}.ext"
 * pour ne jamais entrer en collision avec les photos produit
 * ("{proId}/{productId}.ext", voir uploadProductImage côté Pro).
 */
async function postHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const { proId } = params;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? "Requête invalide.");
  }
  const { category, contentType, imageBase64 } = parsed.data;

  const buffer = Buffer.from(imageBase64, "base64");
  if (buffer.byteLength === 0) {
    throw new ApiError(400, "Image invalide.");
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new ApiError(400, "Image trop lourde (5 Mo maximum).");
  }

  const ext = ALLOWED_TYPES[contentType];
  const slug = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "categorie";
  const path = `${proId}/category-${slug}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage.from("product-images").upload(path, buffer, {
    upsert: true,
    contentType,
  });
  if (uploadError) {
    throw new ApiError(500, `Échec de l'upload : ${uploadError.message}`);
  }

  const { data } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
  // Cache-busting : le chemin reste identique d'un remplacement à l'autre
  // (upsert), donc le navigateur servirait sinon l'ancienne photo depuis
  // son cache -- même raison que withCacheBust() côté Pro (uploadsApi.ts).
  const image = `${data.publicUrl}?t=${Date.now()}`;

  await prisma.menuCategory.upsert({
    where: { proId_name: { proId, name: category } },
    create: { proId, name: category, image },
    update: { image },
  });

  return NextResponse.json({ image });
}
export const POST = withErrorHandling(postHandler);

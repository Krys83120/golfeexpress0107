import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo, cohérent avec .../categories/image et apps/pro/src/services/uploadsApi.ts
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const bodySchema = z.object({
  productId: z.string().min(1),
  contentType: z.string().refine((t) => t in ALLOWED_TYPES, "Format non supporté (JPEG, PNG ou WebP uniquement)."),
  // Image encodée en base64 (sans le préfixe "data:...;base64,") -- envoyée
  // en JSON plutôt qu'en multipart pour réutiliser apiFetch tel quel côté
  // admin (voir adminEntitiesApi.ts), même choix que .../categories/image.
  imageBase64: z.string().min(1, "Image manquante."),
});

/**
 * POST /api/admin/pros/[proId]/products/photo
 *
 * Upload la photo d'UN produit (à ne pas confondre avec
 * .../categories/image, qui gère la photo d'une catégorie entière).
 * Réutilise le bucket Storage existant "product-images" et le même schéma
 * de chemin que les photos produit ajoutées côté Pro
 * ("{proId}/{productId}.ext", voir uploadsApi.ts côté Pro) -- upsert:true
 * remplace simplement l'ancienne photo si le produit en avait déjà une.
 * Ajouté pour les produits importés par CSV, qui n'ont pas de photo (voir
 * AdminCategoryManagerModal.tsx).
 */
async function postHandler(req: NextRequest, { params }: { params: { proId: string } }) {
  await requireAuth(req, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  const { proId } = params;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0]?.message ?? "Requête invalide.");
  }
  const { productId, contentType, imageBase64 } = parsed.data;

  const existing = await prisma.product.findFirst({ where: { id: productId, proId } });
  if (!existing) {
    throw new ApiError(404, "Produit introuvable.");
  }

  const buffer = Buffer.from(imageBase64, "base64");
  if (buffer.byteLength === 0) {
    throw new ApiError(400, "Image invalide.");
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new ApiError(400, "Image trop lourde (5 Mo maximum).");
  }

  const ext = ALLOWED_TYPES[contentType];
  const path = `${proId}/${productId}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage.from("product-images").upload(path, buffer, {
    upsert: true,
    contentType,
  });
  if (uploadError) {
    throw new ApiError(500, `Échec de l'upload : ${uploadError.message}`);
  }

  const { data } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
  // Cache-busting : le chemin reste identique d'un remplacement à l'autre
  // (upsert), donc le navigateur servirait sinon l'ancienne photo depuis son
  // cache -- même raison que côté .../categories/image.
  const image = `${data.publicUrl}?t=${Date.now()}`;

  await prisma.product.update({ where: { id: productId }, data: { image } });

  return NextResponse.json({ image });
}
export const POST = withErrorHandling(postHandler);

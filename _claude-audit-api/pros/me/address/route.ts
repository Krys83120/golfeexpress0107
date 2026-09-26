import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const upsertAddressSchema = z.object({
  street: z.string().min(1, "La rue est requise."),
  complement: z.string().nullable().optional(),
  zipCode: z.string().min(4, "Le code postal est requis."),
  city: z.string().min(1, "La ville est requise."),
});

/**
 * Géocode une adresse française via l'API publique et gratuite
 * "API Adresse" (api-adresse.data.gouv.fr, données officielles de la Base
 * Adresse Nationale, aucune clé requise) — évite de demander au Pro de
 * pointer sa boutique sur une carte manuellement.
 */
async function geocode(street: string, zipCode: string, city: string): Promise<{ lat: number; lng: number }> {
  const query = encodeURIComponent(`${street} ${zipCode} ${city}`);
  const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${query}&limit=1`);
  if (!response.ok) {
    throw new ApiError(502, "Le service de géocodage est momentanément indisponible.");
  }
  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature) {
    throw new ApiError(400, "Adresse introuvable — vérifiez la rue, le code postal et la ville saisis.");
  }
  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
}

/**
 * PUT /api/pros/me/address
 *
 * Crée ou met à jour l'adresse UNIQUE de l'établissement du Pro (contrairement
 * au carnet d'adresses multiple du Client) — géocodée automatiquement pour
 * apparaître correctement positionnée sur les cartes Admin/Client.
 */
async function putHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.PRO]);

  const pro = await prisma.pro.findUnique({ where: { userId: auth.userId }, include: { addresses: true } });
  if (!pro) {
    throw new ApiError(404, "Profil commerçant introuvable.");
  }

  const body = await req.json().catch(() => null);
  const parsed = upsertAddressSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { lat, lng } = await geocode(parsed.data.street, parsed.data.zipCode, parsed.data.city);

  const existing = pro.addresses[0];
  const addressData = {
    label: "Boutique",
    street: parsed.data.street,
    complement: parsed.data.complement ?? null,
    zipCode: parsed.data.zipCode,
    city: parsed.data.city,
    lat,
    lng,
    isDefault: true,
  };

  const address = existing
    ? await prisma.address.update({ where: { id: existing.id }, data: addressData })
    : await prisma.address.create({ data: { ...addressData, proId: pro.id } });

  if (!existing) {
    await prisma.pro.update({ where: { id: pro.id }, data: { pickupAddressId: address.id } });
  }

  return NextResponse.json({ address: { ...address, lat: Number(address.lat), lng: Number(address.lng) } });
}

export const PUT = withErrorHandling(putHandler);

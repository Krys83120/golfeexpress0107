import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createAddressSchema } from "@/lib/validation/addresses";

/**
 * GET /api/addresses
 * Carnet d'adresses de l'utilisateur connecté (n'importe quel rôle —
 * un Pro peut aussi avoir des adresses personnelles, distinctes de
 * l'adresse de sa boutique qui vit sur Pro.addresses).
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req);

  const addresses = await prisma.address.findMany({
    where: { userId: auth.userId },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });

  return NextResponse.json({ addresses });
}

/**
 * POST /api/addresses
 * Body: { label, street, complement?, zipCode, city, lat, lng, isDefault? }
 *
 * Si isDefault=true, on désactive isDefault sur les autres adresses de
 * l'utilisateur dans la même transaction, pour garantir qu'il n'y a jamais
 * plus d'une adresse par défaut à la fois.
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req);

  const body = await req.json().catch(() => null);
  const parsed = createAddressSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { isDefault, ...data } = parsed.data;

  const address = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (isDefault) {
      await tx.address.updateMany({
        where: { userId: auth.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Première adresse de l'utilisateur -> par défaut automatiquement,
    // même si isDefault n'a pas été explicitement demandé.
    const existingCount = await tx.address.count({ where: { userId: auth.userId } });

    return tx.address.create({
      data: { ...data, userId: auth.userId, isDefault: isDefault ?? existingCount === 0 },
    });
  });

  return NextResponse.json({ address }, { status: 201 });
}

export const GET = withErrorHandling(getHandler);
export const POST = withErrorHandling(postHandler);

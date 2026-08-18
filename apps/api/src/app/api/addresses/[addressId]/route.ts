import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { updateAddressSchema } from "@/lib/validation/addresses";

async function getOwnedAddressOrThrow(userId: string, addressId: string) {
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== userId) {
    throw new ApiError(404, "Adresse introuvable.");
  }
  return address;
}

/**
 * PATCH /api/addresses/[addressId]
 */
async function patchHandler(req: NextRequest, ctx: { params: { addressId: string } }) {
  const auth = await requireAuth(req);
  await getOwnedAddressOrThrow(auth.userId, ctx.params.addressId);

  const body = await req.json().catch(() => null);
  const parsed = updateAddressSchema.safeParse(body);
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
    return tx.address.update({
      where: { id: ctx.params.addressId },
      data: { ...data, ...(isDefault !== undefined ? { isDefault } : {}) },
    });
  });

  return NextResponse.json({ address });
}

/**
 * DELETE /api/addresses/[addressId]
 */
async function deleteHandler(req: NextRequest, ctx: { params: { addressId: string } }) {
  const auth = await requireAuth(req);
  await getOwnedAddressOrThrow(auth.userId, ctx.params.addressId);

  try {
    await prisma.address.delete({ where: { id: ctx.params.addressId } });
  } catch (err) {
    // P2003 = violation de contrainte de cle etrangere -- cette adresse est
    // encore referencee par au moins une commande passee (Order.fromAddressId
    // ou toAddressId, sans cascade volontaire pour ne jamais perdre
    // l'adresse d'une commande historique). On refuse la suppression avec un
    // message clair plutot que de laisser remonter une erreur 500 generique.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new ApiError(409, "Cette adresse est utilisee par une commande passee et ne peut pas etre supprimee.");
    }
    throw err;
  }

  return NextResponse.json({ success: true });
}

export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);

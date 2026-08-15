import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus, PaymentStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validation/orders";
import { computeOpenStatus } from "@/lib/openingHours";

// Frais fixes appliqués par la plateforme — à terme, ces valeurs devraient
// venir de GlobalSetting (min_delivery_fee, max_delivery_fee, etc.) plutôt
// que d'être codées ici. Laissé en constantes pour ce premier jet ; prévoir
// un GET /api/settings qui lit GlobalSetting pour remplacer ces valeurs.
const SERVICE_FEE = 0.99;
const DEFAULT_DELIVERY_FEE = 2.9;
const PLATFORM_COMMISSION_RATE_FALLBACK = 0.15;
const RIDER_SHARE_OF_DELIVERY_FEE = 0.8;

/**
 * POST /api/orders
 *
 * Crée une commande pour le Client connecté. Calcule les montants
 * (subtotal à partir des prix actuels des Product, frais de livraison,
 * frais de service, répartition pro/rider/plateforme) côté serveur — les
 * apps ne doivent jamais envoyer de montants, uniquement des productId +
 * quantités, pour éviter qu'un client manipule les prix.
 *
 * Body: { proId, fromAddressId, toAddressId, items: [{productId, quantity, options?}], clientNote? }
 */
async function postHandler(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CLIENT]);

  const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
  if (!client) {
    throw new ApiError(404, "Profil client introuvable.");
  }

  const body = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const { proId, fromAddressId, toAddressId, items, clientNote } = parsed.data;

  const pro = await prisma.pro.findUnique({ where: { id: proId }, include: { openingHours: true } });
  if (!pro || pro.status !== "ACTIVE") {
    throw new ApiError(404, "Ce commerçant n'est pas disponible actuellement.");
  }

  // Vérification serveur du statut ouvert/fermé — indispensable en plus du
  // badge affiché côté Client (qui peut être obsolète de quelques minutes
  // ou contourné) : évite qu'une commande soit créée chez un commerçant
  // fermé (horaires ou "En vacances"/"Fermé" — voir lib/openingHours.ts).
  const openStatus = computeOpenStatus(pro.openingHours, {
    isManuallyClosed: pro.isManuallyClosed,
    manualClosureReason: pro.manualClosureReason,
    manualClosureUntil: pro.manualClosureUntil,
    manualClosureNote: pro.manualClosureNote,
  });
  if (!openStatus.isOpen) {
    throw new ApiError(400, "Ce commerçant est actuellement fermé — commande impossible pour le moment.");
  }

  // fromAddress doit être une adresse du Pro (point de retrait), toAddress
  // doit appartenir au client connecté (point de livraison) — on vérifie
  // les deux pour éviter qu'un client livre "chez" quelqu'un d'autre par erreur.
  const [fromAddress, toAddress] = await Promise.all([
    prisma.address.findUnique({ where: { id: fromAddressId } }),
    prisma.address.findUnique({ where: { id: toAddressId } }),
  ]);

  if (!fromAddress || fromAddress.proId !== proId) {
    throw new ApiError(400, "Adresse de retrait invalide pour ce commerçant.");
  }
  if (!toAddress || toAddress.userId !== auth.userId) {
    throw new ApiError(400, "Adresse de livraison invalide.");
  }

  // Récupère les produits demandés en une seule requête, vérifie qu'ils
  // appartiennent bien à ce Pro et sont disponibles.
  // Type annoté explicitement : avec le client Prisma réellement généré
  // (npx prisma generate, voir README), ce type correspond exactement au
  // retour de prisma.product.findMany — utile aussi en environnement où le
  // client n'a pas pu être généré avec son moteur natif.
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { options: { include: { choices: true } } },
  });

  const productById = new Map(products.map((p) => [p.id, p]));

  /**
   * Calcule le supplément de prix total pour les options choisies sur un
   * article. `selectedOptions` associe le nom d'un groupe d'options (ex:
   * "La taille") au(x) nom(s) du/des choix sélectionné(s) — plusieurs choix
   * pour un groupe à choix multiples sont séparés par ", " (voir le format
   * envoyé par l'app Client, ProductOptionsModal.tsx).
   */
  function computeOptionsSurcharge(
    product: (typeof products)[number],
    selectedOptions: Record<string, string> | undefined
  ): number {
    if (!selectedOptions) return 0;
    let surcharge = 0;
    for (const [groupName, selectedChoiceNames] of Object.entries(selectedOptions)) {
      const group = product.options.find((o) => o.name === groupName);
      if (!group) continue;
      const chosenNames = selectedChoiceNames.split(",").map((n) => n.trim());
      for (const choiceName of chosenNames) {
        const choice = group.choices.find((c) => c.name === choiceName);
        if (choice) surcharge += Number(choice.priceModifier);
      }
    }
    return surcharge;
  }

  let subtotal = 0;
  const orderItemsData = items.map((item) => {
    const product = productById.get(item.productId);
    if (!product || product.proId !== proId) {
      throw new ApiError(400, `Produit invalide: ${item.productId}.`);
    }
    if (!product.isAvailable) {
      throw new ApiError(400, `"${product.name}" n'est plus disponible.`);
    }

    const unitPrice = Number(product.price) + computeOptionsSurcharge(product, item.options);
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      options: item.options ?? undefined,
    };
  });

  const deliveryFee = DEFAULT_DELIVERY_FEE;
  const serviceFee = SERVICE_FEE;
  const total = subtotal + deliveryFee + serviceFee;

  const commissionRate = Number(pro.commissionRate ?? PLATFORM_COMMISSION_RATE_FALLBACK);
  const proEarnings = subtotal * (1 - commissionRate);
  const riderEarnings = deliveryFee * RIDER_SHARE_OF_DELIVERY_FEE;
  const platformEarnings = total - proEarnings - riderEarnings;

  const orderNumber = `GE-${Date.now().toString().slice(-8)}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      clientId: client.id,
      proId,
      fromAddressId,
      toAddressId,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      subtotal,
      deliveryFee,
      serviceFee,
      total,
      proEarnings,
      riderEarnings,
      platformEarnings,
      clientNote: clientNote ?? undefined,
      items: { create: orderItemsData },
      statusHistory: {
        create: { status: OrderStatus.PENDING, changedBy: auth.userId },
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ order }, { status: 201 });
}

/**
 * GET /api/orders
 *
 * Liste les commandes de l'utilisateur connecté, adaptée à son rôle :
 *  - CLIENT  -> ses propres commandes
 *  - PRO     -> les commandes reçues par sa boutique
 *  - RIDER   -> les commandes qui lui sont assignées
 *  - ADMIN/SUPER_ADMIN -> toutes les commandes (vue plateforme)
 *
 * Query params optionnels: ?status=PENDING,PREPARING (CSV)
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req);

  const statusParam = req.nextUrl.searchParams.get("status");
  const statusFilter = statusParam
    ? { status: { in: statusParam.split(",") as OrderStatus[] } }
    : {};

  let where: Record<string, unknown> = { ...statusFilter };

  if (auth.role === UserRole.CLIENT) {
    const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
    if (!client) throw new ApiError(404, "Profil client introuvable.");
    where = { ...where, clientId: client.id };
  } else if (auth.role === UserRole.PRO) {
    const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
    if (!pro) throw new ApiError(404, "Profil commerçant introuvable.");
    where = { ...where, proId: pro.id };
  } else if (auth.role === UserRole.RIDER) {
    const rider = await prisma.rider.findUnique({ where: { userId: auth.userId } });
    if (!rider) throw new ApiError(404, "Profil livreur introuvable.");
    where = { ...where, riderId: rider.id };
  }
  // ADMIN / SUPER_ADMIN : pas de filtre additionnel, vue complète.

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      client: { select: { id: true, user: { select: { firstName: true, lastName: true, phone: true } } } },
      pro: { select: { id: true, businessName: true, logo: true, category: true } },
      rider: { select: { id: true, userId: true, currentLat: true, currentLng: true, vehicleType: true } },
      fromAddress: true,
      toAddress: true,
    },
    orderBy: { placedAt: "desc" },
    take: 50,
  });

  // rider.currentLat/currentLng sont des Decimal Prisma -> sérialisés en
  // texte par défaut en JSON, ce qui casserait leur usage direct comme
  // coordonnées sur la carte de suivi côté Client. On les caste ici.
  const serialized = orders.map((order) => ({
    ...order,
    rider: order.rider
      ? {
          ...order.rider,
          currentLat: order.rider.currentLat !== null ? Number(order.rider.currentLat) : null,
          currentLng: order.rider.currentLng !== null ? Number(order.rider.currentLng) : null,
        }
      : null,
  }));

  return NextResponse.json({ orders: serialized });
}

export const POST = withErrorHandling(postHandler);
export const GET = withErrorHandling(getHandler);

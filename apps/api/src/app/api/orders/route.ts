import { NextRequest, NextResponse } from "next/server";
import { UserRole, OrderStatus, PaymentStatus } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createOrderSchema } from "@/lib/validation/orders";
import { computeOpenStatus } from "@/lib/openingHours";
import { generateDeliveryCode } from "@/lib/deliveryCode";
import { normalizeCity } from "@/lib/normalizeCity";
import { haversineDistanceKm } from "@/lib/distance";
import {
  isCityGatingEnabled,
  isRiderCheckEnabled,
  isOpeningHoursMandatoryEnabled,
  getAvailableRidersCount,
} from "@/lib/capacitySettings";
import {
  isMinOrderByDistanceEnabled,
  getMinOrderTiers,
  computeRequiredMinOrder,
  getEffectiveDeliveryFee,
  getRiderPayForDistance,
} from "@/lib/pricingSettings";

// Frais de service — pas encore piloté depuis Admin > Tarification (voir
// pricingSettings.ts pour les frais de livraison et la rémunération
// livreur, qui eux le sont depuis l'échange produit du 21/08/2026).
const SERVICE_FEE = 0.99;
const PLATFORM_COMMISSION_RATE_FALLBACK = 0.18;

// Quantité maximale acceptée pour un même choix répété sur une ligne (ex:
// "Bacon" x20 maxi) -- filet de sécurité pur, le vrai plafond métier reste
// ProductOption.maxChoices quand le Pro en règle un pour le groupe. Évite
// qu'un appel API direct (contournant ProductOptionsModal.tsx côté Client)
// n'envoie une quantité absurde pour un choix, même sur un groupe sans
// maxChoices défini. Même valeur que côté Client, voir MAX_QTY_PER_CHOICE
// dans ProductOptionsModal.tsx.
const MAX_QTY_PER_CHOICE = 20;

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

  // Horaires d'ouverture obligatoires (voir capacitySettings.ts —
  // isOpeningHoursMandatoryEnabled) : un Pro qui n'a jamais renseigné
  // d'horaires ne doit pas rester invisible au contrôle "ouvert/fermé"
  // ci-dessous — distinct du message "commerçant fermé" pour que le client
  // comprenne qu'il s'agit d'un commerçant pas encore complètement
  // configuré, et non simplement fermé à cette heure. Désactivé par défaut.
  if ((await isOpeningHoursMandatoryEnabled()) && pro.openingHours.length === 0) {
    throw new ApiError(
      400,
      "Ce commerçant n'a pas encore renseigné ses horaires d'ouverture — commande impossible pour le moment."
    );
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

  // Distance à vol d'oiseau entre le Pro et le client — calculée une seule
  // fois ici, réutilisée à la fois par le garde-fou optionnel "panier
  // minimum selon la distance" et par le calcul de la rémunération livreur
  // (voir pricingSettings.ts — getRiderPayForDistance), qui dépend
  // désormais de la distance et non plus d'un montant fixe.
  const distanceKm = haversineDistanceKm(
    Number(fromAddress.lat),
    Number(fromAddress.lng),
    Number(toAddress.lat),
    Number(toAddress.lng)
  );

  // Sécurisation de la capacité de livraison (voir échange produit du
  // 20/08/2026) — deux garde-fous INDÉPENDANTS, chacun n'ayant d'effet que
  // si son réglage GlobalSetting correspondant est activé depuis
  // Admin > Zones & Capacité. Tant que rien n'est activé, ce bloc entier ne
  // change rien au comportement existant (aucune commande refusée).
  if (await isCityGatingEnabled()) {
    // Ouverture progressive commune par commune : une commande n'est
    // acceptée que si la ville de l'adresse de livraison correspond à une
    // ServiceCity marquée active. Comparaison normalisée (accents/casse)
    // plutôt qu'exacte, voir normalizeCity().
    const cities = await prisma.serviceCity.findMany({ where: { isActive: true }, select: { name: true } });
    const normalizedActiveCities = new Set(cities.map((c) => normalizeCity(c.name)));
    if (!normalizedActiveCities.has(normalizeCity(toAddress.city))) {
      throw new ApiError(
        400,
        `Do You Geckoo n'est pas encore disponible à ${toAddress.city}. Nous ouvrons le service commune par commune — revenez bientôt !`
      );
    }
  }

  if (await isRiderCheckEnabled()) {
    // Garde-fou volontairement simple pour ce premier palier : capacité
    // globale (tous livreurs en ligne ET sans course active en cours,
    // toutes communes confondues), pas encore un calcul par zone avec ETA
    // réel par livreur — voir le message livré à l'utilisateur le
    // 20/08/2026 pour la feuille de route complète (P1/P2). Un livreur
    // "disponible" = en ligne, KYC validé, et sans commande dans un statut
    // actif (RIDER_ASSIGNED/PICKED_UP/IN_DELIVERY) — voir getAvailableRidersCount,
    // seule source de vérité pour ce calcul (aussi utilisée par l'indicateur
    // temps réel du Dashboard admin).
    const availableRidersCount = await getAvailableRidersCount();
    if (availableRidersCount === 0) {
      throw new ApiError(
        503,
        "🦎 Nos Geckoo sont actuellement tous en livraison. Réessayez dans quelques minutes — merci de votre patience !"
      );
    }
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
    // orderBy imbriqué obligatoire sur options ET choices -- reorderOptionsByProductDefinition
    // ci-dessous s'appuie sur cet ordre pour réordonner les options choisies
    // par le client selon celui configuré par le Pro ; sans lui, l'ordre
    // renvoyé par Prisma/Postgres n'est pas garanti stable (voir
    // ProductOption.sortOrder / OptionChoice.sortOrder dans schema.prisma).
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
        include: { choices: { orderBy: { sortOrder: "asc" } } },
      },
    },
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

  /**
   * Réordonne les clés de `selectedOptions` (groupe -> choix) selon l'ordre
   * des groupes d'options tel que défini sur la fiche produit (product.options,
   * dans l'ordre renvoyé par Prisma), plutôt que l'ordre dans lequel le
   * client les a envoyées (qui peut varier selon l'ordre de clic du
   * client). Cet ordre est celui affiché ensuite sur le ticket de
   * préparation (voir printLabel.ts) -- l'employé qui prépare doit voir les
   * options dans le même ordre que sur la fiche produit du Pro, pas en
   * ordre alphabétique ni en ordre de sélection client.
   */
  function reorderOptionsByProductDefinition(
    product: (typeof products)[number],
    selectedOptions: Record<string, string> | undefined
  ): Record<string, string> | undefined {
    if (!selectedOptions) return undefined;
    const ordered: Record<string, string> = {};
    for (const group of product.options) {
      if (group.name in selectedOptions) {
        ordered[group.name] = selectedOptions[group.name];
      }
    }
    // Filet de sécurité : si un groupe envoyé par le client est introuvable
    // sur la fiche produit actuelle (ex: produit modifié entre-temps), on le
    // garde quand même à la fin plutôt que de perdre l'info silencieusement.
    for (const [groupName, value] of Object.entries(selectedOptions)) {
      if (!(groupName in ordered)) ordered[groupName] = value;
    }
    return ordered;
  }

  /**
   * Revalide côté serveur le nombre de choix envoyés pour chaque groupe à
   * choix multiples contre sa limite `maxChoices` -- ne JAMAIS faire
   * confiance uniquement au blocage côté Client (ProductOptionsModal.tsx),
   * qui peut être contourné (appel direct à l'API, ancienne version de
   * l'app en cache...). `selectedChoiceNames` est la chaîne "A, B" telle
   * qu'envoyée pour ce groupe (voir computeOptionsSurcharge ci-dessus pour
   * le même pattern de parsing).
   */
  function assertWithinMaxChoices(product: (typeof products)[number], selectedOptions: Record<string, string> | undefined) {
    if (!selectedOptions) return;
    for (const [groupName, selectedChoiceNames] of Object.entries(selectedOptions)) {
      const group = product.options.find((o) => o.name === groupName);
      if (!group || !group.isMultiple || !group.maxChoices) continue;
      const chosenCount = selectedChoiceNames.split(",").map((n) => n.trim()).filter(Boolean).length;
      if (chosenCount > group.maxChoices) {
        throw new ApiError(
          400,
          `"${group.name}" : maximum ${group.maxChoices} choix (${chosenCount} envoyés) pour "${product.name}".`
        );
      }
    }
  }

  /**
   * Revalide côté serveur qu'aucun choix sélectionné n'est en rupture
   * (OptionChoice.isAvailable=false, voir ProductFormModal.tsx côté Pro) --
   * même principe de défense en profondeur que assertWithinMaxChoices
   * ci-dessus : le blocage côté Client (ProductOptionsModal.tsx, choix grisé
   * et non sélectionnable) peut être contourné.
   */
  function assertChoicesAvailable(product: (typeof products)[number], selectedOptions: Record<string, string> | undefined) {
    if (!selectedOptions) return;
    for (const [groupName, selectedChoiceNames] of Object.entries(selectedOptions)) {
      const group = product.options.find((o) => o.name === groupName);
      if (!group) continue;
      const chosenNames = selectedChoiceNames.split(",").map((n) => n.trim()).filter(Boolean);
      for (const choiceName of chosenNames) {
        const choice = group.choices.find((c) => c.name === choiceName);
        if (choice && !choice.isAvailable) {
          throw new ApiError(400, `"${choiceName}" (${group.name}) n'est plus disponible pour "${product.name}".`);
        }
      }
    }
  }

  /**
   * Revalide côté serveur qu'un choix répété plusieurs fois sur la même
   * ligne (ex: "Bacon, Bacon, Bacon, Bacon" -- quantité encodée en répétant
   * le nom du choix dans la chaîne CSV, voir ProductOptionsModal.tsx côté
   * Client) est bien autorisé pour CE choix précis
   * (OptionChoice.allowMultipleQty, réglable par le Pro dans
   * ProductFormModal.tsx) et ne dépasse pas MAX_QTY_PER_CHOICE -- même
   * principe de défense en profondeur que assertWithinMaxChoices et
   * assertChoicesAvailable ci-dessus : le blocage côté Client peut être
   * contourné.
   */
  function assertQuantifiableChoices(product: (typeof products)[number], selectedOptions: Record<string, string> | undefined) {
    if (!selectedOptions) return;
    for (const [groupName, selectedChoiceNames] of Object.entries(selectedOptions)) {
      const group = product.options.find((o) => o.name === groupName);
      if (!group) continue;
      const chosenNames = selectedChoiceNames.split(",").map((n) => n.trim()).filter(Boolean);
      const counts = new Map<string, number>();
      for (const name of chosenNames) counts.set(name, (counts.get(name) ?? 0) + 1);
      for (const [choiceName, count] of counts) {
        if (count > MAX_QTY_PER_CHOICE) {
          throw new ApiError(
            400,
            `"${choiceName}" (${group.name}) : quantité maximale ${MAX_QTY_PER_CHOICE} dépassée pour "${product.name}".`
          );
        }
        if (count <= 1) continue;
        const choice = group.choices.find((c) => c.name === choiceName);
        if (choice && !choice.allowMultipleQty) {
          throw new ApiError(
            400,
            `"${choiceName}" (${group.name}) ne peut être ajouté qu'une seule fois pour "${product.name}".`
          );
        }
      }
    }
  }

  /**
   * Revalide côté serveur les groupes CONDITIONNELS (ProductOption.dependsOnChoiceId,
   * voir schema.prisma) -- ex: "Boisson"/"Accompagnement" qui ne doivent
   * s'appliquer que si le client a choisi "En Menu" dans le groupe
   * "Formule". Même principe de défense en profondeur que les autres
   * assert* ci-dessus : le masquage côté Client (ProductOptionsModal.tsx,
   * groupe simplement pas affiché tant que sa dépendance n'est pas
   * satisfaite) peut être contourné par un appel API direct.
   *
   * `dependsOnChoiceId` référence un OptionChoice par id -- on retrouve son
   * groupe/nom en parcourant product.options (le choix référencé appartient
   * forcément au même produit, voir la résolution position -> id dans
   * options/route.ts).
   */
  function assertGroupDependenciesSatisfied(
    product: (typeof products)[number],
    selectedOptions: Record<string, string> | undefined
  ) {
    for (const group of product.options) {
      if (!group.dependsOnChoiceId) continue;
      let targetGroupName: string | null = null;
      let targetChoiceName: string | null = null;
      for (const candidateGroup of product.options) {
        const choice = candidateGroup.choices.find((c) => c.id === group.dependsOnChoiceId);
        if (choice) {
          targetGroupName = candidateGroup.name;
          targetChoiceName = choice.name;
          break;
        }
      }
      // Dépendance orpheline (choix référencé introuvable, ex: donnée
      // incohérente) -- on ignore plutôt que de bloquer toute la commande.
      if (!targetGroupName || !targetChoiceName) continue;

      const selectedInTargetGroup = (selectedOptions?.[targetGroupName] ?? "")
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      const isActive = selectedInTargetGroup.includes(targetChoiceName);
      const rawSelectionForThisGroup = selectedOptions?.[group.name];
      const hasSelectionForThisGroup = !!rawSelectionForThisGroup && rawSelectionForThisGroup.trim() !== "";

      if (!isActive && hasSelectionForThisGroup) {
        throw new ApiError(
          400,
          `"${group.name}" ne s'applique pas pour "${product.name}" avec la sélection actuelle.`
        );
      }
      if (isActive && group.isRequired && !hasSelectionForThisGroup) {
        throw new ApiError(400, `"${group.name}" est obligatoire pour "${product.name}".`);
      }
    }
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
    assertWithinMaxChoices(product, item.options);
    assertChoicesAvailable(product, item.options);
    assertQuantifiableChoices(product, item.options);
    assertGroupDependenciesSatisfied(product, item.options);

    const unitPrice = Number(product.price) + computeOptionsSurcharge(product, item.options);
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      totalPrice,
      options: reorderOptionsByProductDefinition(product, item.options),
      // N'accepte l'instruction que si le Pro a explicitement activé cette
      // fonctionnalité pour ce produit -- sinon on l'ignore silencieusement
      // plutôt que de rejeter toute la commande pour un champ que le client
      // n'aurait pas dû pouvoir remplir (ex: appel API direct).
      specialInstructions: product.allowSpecialInstructions ? item.specialInstructions ?? null : null,
    };
  });

  // Panier minimum selon la distance (échange produit du 20/08/2026) —
  // protège la marge Geckoo sur les petites commandes livrées loin
  // (frais de livraison et part livreur restent volontairement fixes,
  // voir pricingSettings.ts). Désactivé par défaut : ce bloc ne change rien
  // tant que l'admin n'a pas activé "Panier minimum selon la distance"
  // depuis Admin > Tarification.
  if (await isMinOrderByDistanceEnabled()) {
    const tiers = await getMinOrderTiers();
    const requiredMinOrder = computeRequiredMinOrder(distanceKm, tiers);
    if (subtotal < requiredMinOrder) {
      throw new ApiError(
        400,
        `Panier minimum de ${requiredMinOrder.toFixed(2)} € pour une livraison à ${distanceKm.toFixed(
          1
        )} km — ajoutez des articles pour atteindre ce montant.`
      );
    }
  }

  // Supplément par distance (échange produit du 22/08/2026) si activé, PUIS
  // livraison gratuite si le panier atteint le seuil configuré (même date,
  // désactivé par défaut) — voir getEffectiveDeliveryFee dans
  // pricingSettings.ts. Sinon tarif fixe unique inchangé.
  const deliveryFee = await getEffectiveDeliveryFee(distanceKm, subtotal);
  const serviceFee = SERVICE_FEE;
  const total = subtotal + deliveryFee + serviceFee;

  const commissionRate = Number(pro.commissionRate ?? PLATFORM_COMMISSION_RATE_FALLBACK);
  const proEarnings = subtotal * (1 - commissionRate);
  const riderEarnings = await getRiderPayForDistance(distanceKm);
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
      // Code à 4 chiffres que le client devra communiquer au livreur pour
      // valider la remise — généré une fois pour toutes ici, jamais changé
      // ensuite (voir sendOrderConfirmedEmail et TrackingScreen.tsx pour la
      // communication au client, et orders/[orderId]/status/route.ts pour
      // la vérification côté livreur).
      deliveryCode: generateDeliveryCode(),
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

const STALE_PENDING_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Annule automatiquement les commandes restées PENDING (jamais payées)
 * depuis plus de 5 minutes -- sans ça, une commande abandonnée par un client
 * avant paiement reste indéfiniment "en attente" et s'accumule dans la vue
 * Admin/Pro, sans qu'aucun bouton ne permette de la supprimer ("ça pollue la
 * vue" -- échange produit du 23/08/2026).
 *
 * Appelé ici, au tout début de GET /api/orders (lu très régulièrement par
 * TOUS les rôles -- Admin toutes les 15s, Pro à chaque chargement/
 * rafraîchissement) plutôt que via un cron Vercel séparé : évite toute
 * dépendance à un plan Vercel supportant des cron jobs fréquents, et le
 * nettoyage reste quasi temps réel tant qu'au moins un dashboard est ouvert
 * quelque part sur la plateforme.
 *
 * Ne touche volontairement JAMAIS paymentStatus ici : si un paiement Stripe
 * finit malgré tout par aboutir après coup pour une commande déjà annulée
 * (webhook en retard), c'est le webhook lui-même qui gère ce cas précis --
 * remboursement automatique plutôt que de laisser paymentStatus passer à
 * CAPTURED sur une commande déjà annulée (voir webhooks/stripe/route.ts).
 */
async function cancelStalePendingOrders(): Promise<void> {
  const staleOrders = await prisma.order.findMany({
    where: { status: OrderStatus.PENDING, placedAt: { lt: new Date(Date.now() - STALE_PENDING_TIMEOUT_MS) } },
    select: { id: true },
  });
  if (staleOrders.length === 0) return;

  const staleIds = staleOrders.map((o) => o.id);
  await prisma.order.updateMany({
    where: { id: { in: staleIds } },
    data: { status: OrderStatus.CANCELLED },
  });
  await prisma.orderStatusHistory.createMany({
    data: staleIds.map((orderId) => ({
      orderId,
      status: OrderStatus.CANCELLED,
      note: "Annulée automatiquement — paiement non reçu sous 5 minutes.",
    })),
  });
}

/**
 * Exclut les commandes PENDING (pas encore payées) du `where` d'un Pro ou
 * PRO_EMPLOYEE -- une commande reste PENDING tant que le paiement Stripe
 * n'est pas confirmé (voir webhooks/stripe, event payment_intent.succeeded,
 * qui fait passer PENDING -> CONFIRMED en même temps que paymentStatus ->
 * CAPTURED, de façon atomique). Le Pro ne doit jamais voir une commande non
 * payée dans sa file : ça évite la confusion "commande visible chez moi
 * alors que le client n'a peut-être même pas terminé son paiement" --
 * échange produit du 23/08/2026. Seul Admin/Super Admin garde une vue
 * complète (PENDING inclus), pour le suivi/support.
 *
 * Combine via `AND` plutôt que d'écraser `where.status` directement : si un
 * `?status=` explicite est un jour passé pour un Pro, les deux contraintes
 * restent actives au lieu que l'une écrase l'autre (les deux utilisent la
 * même clé `status`).
 */
function excludePendingForPro(where: Record<string, unknown>): Record<string, unknown> {
  const { status: existingStatusFilter, ...rest } = where;
  return {
    ...rest,
    AND: [
      ...(existingStatusFilter !== undefined ? [{ status: existingStatusFilter }] : []),
      { status: { not: OrderStatus.PENDING } },
    ],
  };
}

async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req);

  await cancelStalePendingOrders();

  const statusParam = req.nextUrl.searchParams.get("status");
  const statusFilter = statusParam
    ? { status: { in: statusParam.split(",") as OrderStatus[] } }
    : {};

  // Filtre par période (placedAt) -- utilisé notamment par la page Admin
  // "Commandes" (traçabilité + statistiques panier moyen jour/semaine/mois,
  // voir apps/admin/src/pages/OrdersPage.tsx) pour charger une plage sans
  // dépendre uniquement du plafond `take` ci-dessous.
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const dateFilter =
    fromParam || toParam
      ? {
          placedAt: {
            ...(fromParam ? { gte: new Date(fromParam) } : {}),
            ...(toParam ? { lte: new Date(toParam) } : {}),
          },
        }
      : {};

  let where: Record<string, unknown> = { ...statusFilter, ...dateFilter };

  if (auth.role === UserRole.CLIENT) {
    const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
    if (!client) throw new ApiError(404, "Profil client introuvable.");
    where = { ...where, clientId: client.id };
  } else if (auth.role === UserRole.PRO) {
    const pro = await prisma.pro.findUnique({ where: { userId: auth.userId } });
    if (!pro) throw new ApiError(404, "Profil commerçant introuvable.");
    where = excludePendingForPro({ ...where, proId: pro.id });
  } else if (auth.role === UserRole.PRO_EMPLOYEE) {
    // Un employé voit exactement les mêmes commandes que son patron (sa
    // boutique), jamais celles des autres Pro -- voir ProEmployee dans
    // prisma/schema.prisma. Sans cette branche, un compte PRO_EMPLOYEE
    // tombait dans le cas "ADMIN/SUPER_ADMIN" ci-dessous (aucun filtre =
    // vue plateforme complète), une fuite de données grave.
    const employee = await prisma.proEmployee.findUnique({ where: { userId: auth.userId } });
    if (!employee) throw new ApiError(404, "Compte employé introuvable ou détaché de sa boutique.");
    where = excludePendingForPro({ ...where, proId: employee.proId });
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
      rider: {
        select: {
          id: true,
          userId: true,
          currentLat: true,
          currentLng: true,
          vehicleType: true,
          // Nom affiché sur le dashboard Admin, carte "Livraisons en cours"
          // (chrono par livreur) — voir ActiveDeliveriesCard.tsx.
          user: { select: { firstName: true, lastName: true } },
        },
      },
      fromAddress: true,
      toAddress: true,
      // Traçabilité complète (qui a fait quoi, quand) -- consommé
      // notamment par la page Admin "Commandes" pour le détail par
      // commande (voir apps/admin/src/pages/OrdersPage.tsx). Petit volume
      // par commande (quelques lignes), négligeable même sur les 50
      // commandes renvoyées ici.
      statusHistory: { orderBy: { changedAt: "asc" } },
    },
    orderBy: { placedAt: "desc" },
    // Plafond volontairement plus haut pour Admin/Super Admin (vue
    // plateforme utilisée pour la traçabilité + les statistiques panier
    // moyen jour/semaine/mois) que pour Client/Pro/Rider (leur propre
    // historique récent suffit). Toujours un plafond, jamais "tout" -- à
    // remonter si 1000 commandes/mois s'avère limitant en pratique.
    take: auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN ? 1000 : 50,
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

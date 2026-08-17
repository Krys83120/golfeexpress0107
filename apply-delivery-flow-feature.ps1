# ============================================================================
# apply-delivery-flow-feature.ps1
#
# Complete le parcours livraison (Krys, session du 17/08) :
#   - Livreur : bouton "Appeler le client" + numero affiche, compte a
#     rebours de livraison (chaine du froid/chaud) avec penalite de retard,
#     capture photo/code a la remise, ecran maintenu allume pendant la
#     course (expo-keep-awake).
#   - Client : ecran de notation post-livraison (produit / commercant /
#     livreur / plateforme, 4 notes separees), accessible depuis "Mes
#     commandes" ou via le lien du mail "Commande livree", avec bouton de
#     partage de l'app.
#   - API : compte a rebours + penalite dans le passage de statut DELIVERED,
#     nouvelle route POST/GET /api/orders/[orderId]/review, mail "Commande
#     livree" qui pointe vers l'ecran de notation.
#
# A executer depuis la RACINE du repo golfeexpress (la ou se trouve le
# dossier "apps"). Modifie des fichiers existants par remplacement de texte
# cible (jamais une reecriture complete, sauf CurrentDeliveryCard.tsx et les
# nouveaux fichiers) : si un fichier a change depuis la derniere session, le
# script s'arrete proprement sur l'edition concernee plutot que de deviner.
#
# Etapes manuelles APRES ce script (voir le recap affiche a la fin) :
#   1. npx prisma migrate dev --name add_review_ratings_and_delivery_penalty
#   2. cd apps/livreur ; npx expo install expo-keep-awake
#   3. Creer le bucket Supabase Storage "delivery-proofs" (public, comme
#      "avatars"/"kyc-documents")
#   4. git status / git add -A / git commit / git push, puis deployer
#      apps/api, apps/livreur ET apps/client (les trois ont change).
# ============================================================================

$ErrorActionPreference = "Stop"

function Write-FileUtf8NoBom {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )
    $dir = Split-Path -Parent $Path
    if ($dir) { [System.IO.Directory]::CreateDirectory($dir) | Out-Null }
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
    Write-Host "Ecrit : $Path"
}

function Update-FileContent {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Old,
        [Parameter(Mandatory=$true)][string]$New
    )
    $content = [System.IO.File]::ReadAllText($Path)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false

    if ($content.Contains($Old)) {
        $updated = $content.Replace($Old, $New)
        [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
        Write-Host "Modifie : $Path"
        return
    }

    # Repli : certains fichiers de ce repo (ex: prisma/schema.prisma) ont des
    # lignes "vides" qui contiennent en realite des espaces de fin invisibles
    # -- plutot que d'echouer sur ce simple detail de formatage, on retente
    # en tolerant des espaces/tabulations sur les lignes vides du bloc recherche.
    $oldLines = $Old -split "`n"
    $patternParts = foreach ($line in $oldLines) {
        if ($line.Trim().Length -eq 0) { '[ \t]*' } else { [regex]::Escape($line) }
    }
    $pattern = [string]::Join("`n", $patternParts)
    $regexMatches = [regex]::Matches($content, $pattern)

    if ($regexMatches.Count -eq 1) {
        $m = $regexMatches[0]
        $updated = $content.Substring(0, $m.Index) + $New + $content.Substring($m.Index + $m.Length)
        [System.IO.File]::WriteAllText($Path, $updated, $utf8NoBom)
        Write-Host "Modifie (espaces de fin de ligne tolerees) : $Path"
        return
    }
    if ($regexMatches.Count -gt 1) {
        throw "Ancien texte trouve plusieurs fois dans $Path (ambigu, meme en tolerant les espaces de fin) -- edition annulee, verifie ce fichier a la main."
    }

    # Deja applique lors d'une execution precedente du script (ex: on relance
    # apres un arret partiel) : on ne ré-applique pas une seconde fois, et on
    # ne considere pas ca comme une erreur.
    if ($content.Contains($New)) {
        Write-Host "Deja applique, ignore : $Path"
        return
    }

    throw "Ancien texte introuvable dans $Path (le fichier a peut-etre change depuis) -- edition annulee, verifie ce fichier a la main."
}

# ============================================================================
# 1. prisma/schema.prisma
# ============================================================================

Update-FileContent -Path "prisma/schema.prisma" `
  -Old @'
enum EarningType {
  DELIVERY_FEE
  TIP
  BONUS
  INCENTIVE
}
'@ `
  -New @'
enum EarningType {
  DELIVERY_FEE
  TIP
  BONUS
  INCENTIVE
  PENALTY
}
'@

Update-FileContent -Path "prisma/schema.prisma" `
  -Old @'
  estimatedDelivery DateTime? @map("estimated_delivery")

  clientNote      String?     @map("client_note")
'@ `
  -New @'
  estimatedDelivery DateTime? @map("estimated_delivery")
  /// true des qu'une penalite de retard a ete appliquee pour cette
  /// commande (voir orders/[orderId]/status/route.ts, transition
  /// DELIVERED) -- evite d'appliquer la penalite deux fois si cette route
  /// etait rappelee par erreur sur une commande deja livree.
  latePenaltyApplied Boolean  @default(false) @map("late_penalty_applied")

  clientNote      String?     @map("client_note")
'@

Update-FileContent -Path "prisma/schema.prisma" `
  -Old @'
  items           OrderItem[]
  statusHistory   OrderStatusHistory[]
  trackingEvents  TrackingEvent[]
}
'@ `
  -New @'
  items           OrderItem[]
  statusHistory   OrderStatusHistory[]
  trackingEvents  TrackingEvent[]
  /// Nomme "reviewRecord" (pas "review") pour ne pas entrer en collision
  /// avec le champ historique Order.review (simple texte libre, conserve
  /// tel quel) -- reviewRecord est le nouvel avis structure a 4 notes
  /// (produit/pro/livreur/plateforme), voir model Review.
  reviewRecord    Review?
}
'@

Update-FileContent -Path "prisma/schema.prisma" `
  -Old @'
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders          Order[]
  earnings        Earning[]
  withdrawals     Withdrawal[]
}
'@ `
  -New @'
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders          Order[]
  earnings        Earning[]
  withdrawals     Withdrawal[]
  reviews         Review[]
}
'@

Update-FileContent -Path "prisma/schema.prisma" `
  -Old @'
model Review {
  id          String   @id @default(uuid())
  clientId    String   @map("client_id")
  proId       String?  @map("pro_id")
  riderId     String?  @map("rider_id")
  orderId     String   @map("order_id")
  rating      Int
  comment     String?
  proReply    String?  @map("pro_reply")
  proRepliedAt DateTime? @map("pro_replied_at")
  isVisible   Boolean  @default(true) @map("is_visible")
  createdAt   DateTime @default(now()) @map("created_at")

  client      Client   @relation(fields: [clientId], references: [id])
  pro         Pro?     @relation(fields: [proId], references: [id])
}
'@ `
  -New @'
model Review {
  id          String   @id @default(uuid())
  clientId    String   @map("client_id")
  proId       String?  @map("pro_id")
  riderId     String?  @map("rider_id")
  orderId     String   @unique @map("order_id")
  /// Note du COMMERCANT (1-5) -- nom de champ historique conserve tel quel
  /// pour ne pas casser ReviewsPage.tsx (cote Pro) qui l'affiche deja.
  rating      Int
  /// Notes complementaires ajoutees pour permettre au client de noter
  /// separement chaque aspect de la commande (voir POST
  /// /api/orders/[orderId]/review) -- toutes optionnelles pour rester
  /// compatibles avec d'eventuels avis anterieurs a cet ajout.
  productRating  Int?  @map("product_rating")
  riderRating    Int?  @map("rider_rating")
  platformRating Int?  @map("platform_rating")
  comment     String?
  proReply    String?  @map("pro_reply")
  proRepliedAt DateTime? @map("pro_replied_at")
  isVisible   Boolean  @default(true) @map("is_visible")
  createdAt   DateTime @default(now()) @map("created_at")

  client      Client   @relation(fields: [clientId], references: [id])
  pro         Pro?     @relation(fields: [proId], references: [id])
  rider       Rider?   @relation(fields: [riderId], references: [id])
  order       Order    @relation(fields: [orderId], references: [id])
}
'@

# ============================================================================
# 2. packages/types/src (enums + models partages par toutes les apps)
# ============================================================================

Update-FileContent -Path "packages/types/src/enums.ts" `
  -Old @'
export enum EarningType {
  DELIVERY_FEE = "DELIVERY_FEE",
  TIP = "TIP",
  BONUS = "BONUS",
  INCENTIVE = "INCENTIVE",
}
'@ `
  -New @'
export enum EarningType {
  DELIVERY_FEE = "DELIVERY_FEE",
  TIP = "TIP",
  BONUS = "BONUS",
  INCENTIVE = "INCENTIVE",
  PENALTY = "PENALTY",
}
'@

Update-FileContent -Path "packages/types/src/models.ts" `
  -Old @'
  estimatedDelivery?: string | null;

  clientNote?: string | null;
'@ `
  -New @'
  estimatedDelivery?: string | null;
  latePenaltyApplied: boolean;

  clientNote?: string | null;
'@

Update-FileContent -Path "packages/types/src/models.ts" `
  -Old @'
export interface Review {
  id: string;
  clientId: string;
  proId?: string | null;
  riderId?: string | null;
  orderId: string;
  rating: number;
  comment?: string | null;
  proReply?: string | null;
  proRepliedAt?: string | null;
  isVisible: boolean;
  createdAt: string;
  client?: Client;
}
'@ `
  -New @'
export interface Review {
  id: string;
  clientId: string;
  proId?: string | null;
  riderId?: string | null;
  orderId: string;
  /** Note du commercant (1-5). */
  rating: number;
  /** Notes complementaires -- voir prisma/schema.prisma model Review. */
  productRating?: number | null;
  riderRating?: number | null;
  platformRating?: number | null;
  comment?: string | null;
  proReply?: string | null;
  proRepliedAt?: string | null;
  isVisible: boolean;
  createdAt: string;
  client?: Client;
}
'@

# ============================================================================
# 3. apps/api -- validation
# ============================================================================

Update-FileContent -Path "apps/api/src/lib/validation/orders.ts" `
  -Old @'
export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
  // Fourni par le Pro en passant une commande en PREPARING — sert à
  // calculer quand lancer la recherche de livreur (voir riderSearchWindow.ts).
  estimatedPrepMinutes: z.number().int().positive().max(180).optional(),
});
'@ `
  -New @'
export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().optional(),
  // Fourni par le Pro en passant une commande en PREPARING — sert à
  // calculer quand lancer la recherche de livreur (voir riderSearchWindow.ts).
  estimatedPrepMinutes: z.number().int().positive().max(180).optional(),
  // Fournis par le Rider en passant une commande en DELIVERED — preuve de
  // remise (voir orders/[orderId]/status/route.ts). Optionnels : certains
  // livreurs/commandes n'ont ni photo ni code à fournir.
  deliveryPhoto: z.string().url().optional(),
  deliveryCode: z.string().max(20).optional(),
});
'@

$reviewsValidation = @'
import { z } from "zod";

/**
 * Body attendu par POST /api/orders/[orderId]/review — un client note en
 * une seule fois les 4 aspects de sa commande (produit, commerçant,
 * livreur, plateforme). riderRating reste optionnel : une commande peut ne
 * jamais avoir eu de livreur assigné dans de rares cas — mieux vaut
 * accepter un avis incomplet que le bloquer entièrement.
 */
export const createReviewSchema = z.object({
  productRating: z.number().int().min(1).max(5),
  proRating: z.number().int().min(1).max(5),
  riderRating: z.number().int().min(1).max(5).optional(),
  platformRating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
'@
Write-FileUtf8NoBom -Path "apps/api/src/lib/validation/reviews.ts" -Content $reviewsValidation

# ============================================================================
# 4. apps/api -- emails
# ============================================================================

Update-FileContent -Path "apps/api/src/lib/emails/orderEmails.ts" `
  -Old @'
interface OrderEmailData {
  orderNumber: string;
  total: number;
  proBusinessName: string;
  items?: OrderEmailItem[];
}
'@ `
  -New @'
interface OrderEmailData {
  orderNumber: string;
  total: number;
  proBusinessName: string;
  items?: OrderEmailItem[];
  /** Utilisé pour deep-linker vers l'écran de notation (voir sendOrderDeliveredEmail) — optionnel pour ne pas casser les appels existants qui n'en ont pas besoin. */
  orderId?: string;
}
'@

Update-FileContent -Path "apps/api/src/lib/emails/orderEmails.ts" `
  -Old @'
    <p style="font-size:13px;color:#6B7280;margin-top:20px;">
      Une seconde d'attention pour ${order.proBusinessName} et votre livreur ? Laissez un avis depuis l'app.
    </p>
    ${button("Laisser un avis", TRACKING_URL)}
  `);
  await sendEmail(email, `Commande ${order.orderNumber} livrée — récapitulatif`, html);
}
'@ `
  -New @'
    <p style="font-size:13px;color:#6B7280;margin-top:20px;">
      Votre avis compte : notez le produit, ${order.proBusinessName}, votre livreur, et Do You Geckoo en
      quelques secondes — et partagez l'app si vous avez aimé l'expérience.
    </p>
    ${button(
      "Laisser un avis",
      order.orderId ? `${PORTAL_URLS.client}?screen=review&orderId=${order.orderId}` : TRACKING_URL
    )}
  `);
  await sendEmail(email, `Commande ${order.orderNumber} livrée — récapitulatif`, html);
}
'@

# ============================================================================
# 5. apps/api -- orders/[orderId]/status/route.ts (compte a rebours, preuve
#    de remise, penalite de retard)
# ============================================================================

$statusRoutePath = "apps/api/src/app/api/orders/[orderId]/status/route.ts"

Update-FileContent -Path $statusRoutePath `
  -Old @'
 * Les apps n'ont rien d'autre à faire pour le temps réel : Supabase Realtime
 * (postgres_changes sur la table Order) notifie automatiquement les clients
 * abonnés dès que cette route met à jour la ligne.
 */
async function patchHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
'@ `
  -New @'
 * Les apps n'ont rien d'autre à faire pour le temps réel : Supabase Realtime
 * (postgres_changes sur la table Order) notifie automatiquement les clients
 * abonnés dès que cette route met à jour la ligne.
 */

// Fenêtre de livraison cible une fois la commande récupérée par le livreur
// (déclenche le compte à rebours affiché côté app Livreur — voir
// CurrentDeliveryCard.tsx) et seuils de pénalité en cas de retard. Comme
// SERVICE_FEE dans orders/route.ts : codé en dur pour ce premier jet, à
// terme remplacer par une lecture de GlobalSetting pour rester réglable
// depuis l'admin sans redéploiement.
const DELIVERY_WINDOW_MINUTES = 30;
const LATE_GRACE_MINUTES = 10;
const LATE_PENALTY_AMOUNT = 2;

async function patchHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
'@

Update-FileContent -Path $statusRoutePath `
  -Old @'
  const { status: nextStatus, note, estimatedPrepMinutes } = parsed.data;
'@ `
  -New @'
  const { status: nextStatus, note, estimatedPrepMinutes, deliveryPhoto, deliveryCode } = parsed.data;
'@

Update-FileContent -Path $statusRoutePath `
  -Old @'
  let proReadyForPayout = false;
  let riderReadyForPayout = false;
  if (nextStatus === OrderStatus.DELIVERED) {
'@ `
  -New @'
  let proReadyForPayout = false;
  let riderReadyForPayout = false;
  // Retard de livraison — comparé à estimatedDelivery (posé au passage
  // PICKED_UP, voir plus bas) avec une marge de grâce avant pénalité.
  // latePenaltyApplied protège contre un double décompte si cette route
  // était rappelée par erreur sur une commande déjà livrée.
  const isLateDelivery =
    nextStatus === OrderStatus.DELIVERED &&
    order.estimatedDelivery !== null &&
    !order.latePenaltyApplied &&
    Date.now() > new Date(order.estimatedDelivery).getTime() + LATE_GRACE_MINUTES * 60_000;
  if (nextStatus === OrderStatus.DELIVERED) {
'@

Update-FileContent -Path $statusRoutePath `
  -Old @'
    const result = await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        ...(extraField ? { [extraField]: new Date() } : {}),
        ...(nextStatus === OrderStatus.PREPARING
          ? { preparingStartedAt: new Date(), estimatedPrepMinutes }
          : {}),
        statusHistory: {
          create: { status: nextStatus, changedBy: auth.userId, note },
        },
      },
      include: { items: true, statusHistory: { orderBy: { changedAt: "asc" } } },
    });
'@ `
  -New @'
    const result = await tx.order.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        ...(extraField ? { [extraField]: new Date() } : {}),
        ...(nextStatus === OrderStatus.PREPARING
          ? { preparingStartedAt: new Date(), estimatedPrepMinutes }
          : {}),
        // Démarre le compte à rebours de livraison dès la récupération
        // (essentiel pour la chaîne du froid/chaud) — affiché en direct
        // côté app Livreur (CurrentDeliveryCard.tsx) et comparé à
        // deliveredAt plus haut (isLateDelivery) pour détecter un retard.
        ...(nextStatus === OrderStatus.PICKED_UP
          ? { estimatedDelivery: new Date(Date.now() + DELIVERY_WINDOW_MINUTES * 60_000) }
          : {}),
        // Preuve de remise, fournie par le Rider en marquant la commande
        // livrée — les deux restent optionnelles (voir updateOrderStatusSchema).
        ...(nextStatus === OrderStatus.DELIVERED
          ? {
              deliveryPhoto: deliveryPhoto ?? undefined,
              deliveryCode: deliveryCode ?? undefined,
              ...(isLateDelivery ? { latePenaltyApplied: true } : {}),
            }
          : {}),
        statusHistory: {
          create: { status: nextStatus, changedBy: auth.userId, note },
        },
      },
      include: { items: true, statusHistory: { orderBy: { changedAt: "asc" } } },
    });
'@

Update-FileContent -Path $statusRoutePath `
  -Old @'
        await tx.rider.update({
          where: { id: result.riderId },
          data: {
            // balance : uniquement incrémenté si PAS de virement auto (sinon
            // l'argent a déjà quitté la plateforme, il n'y a rien "à
            // retirer" en plus).
            ...(riderReadyForPayout ? {} : { balance: { increment: result.riderEarnings } }),
            totalEarnings: { increment: result.riderEarnings },
            totalDeliveries: { increment: 1 },
          },
        });
      }
'@ `
  -New @'
        await tx.rider.update({
          where: { id: result.riderId },
          data: {
            // balance : uniquement incrémenté si PAS de virement auto (sinon
            // l'argent a déjà quitté la plateforme, il n'y a rien "à
            // retirer" en plus).
            ...(riderReadyForPayout ? {} : { balance: { increment: result.riderEarnings } }),
            totalEarnings: { increment: result.riderEarnings },
            totalDeliveries: { increment: 1 },
          },
        });

        // Pénalité de retard — chaîne du froid/chaud (voir demande
        // produit). Volontairement une ligne de solde séparée, jamais une
        // réduction du virement Stripe déjà calculé ci-dessus : reste
        // simple et sûr même si riderReadyForPayout est vrai (le virement
        // automatique part alors pour le montant plein) — la pénalité vient
        // en déduction du PROCHAIN solde/retrait plutôt que de risquer un
        // virement Stripe à montant négatif ou partiel.
        if (isLateDelivery) {
          await tx.earning.create({
            data: {
              riderId: result.riderId,
              orderId: result.id,
              amount: -LATE_PENALTY_AMOUNT,
              type: "PENALTY",
              status: "AVAILABLE",
            },
          });
          await tx.rider.update({
            where: { id: result.riderId },
            data: { balance: { decrement: LATE_PENALTY_AMOUNT } },
          });
        }
      }
'@

Update-FileContent -Path $statusRoutePath `
  -Old @'
      } else if (nextStatus === OrderStatus.DELIVERED) {
        sendOrderDeliveredEmail(client.user.email, emailData).catch((err) =>
          console.error("[order status] Échec email livrée:", err)
        );
'@ `
  -New @'
      } else if (nextStatus === OrderStatus.DELIVERED) {
        sendOrderDeliveredEmail(client.user.email, { ...emailData, orderId: updated.id }).catch((err) =>
          console.error("[order status] Échec email livrée:", err)
        );
'@

# ============================================================================
# 6. apps/api -- NOUVELLE route orders/[orderId]/review
# ============================================================================

$reviewRoute = @'
import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { createReviewSchema } from "@/lib/validation/reviews";

/**
 * POST /api/orders/[orderId]/review
 *
 * Un client note en une seule fois les 4 aspects de sa commande livrée :
 * le produit, le commerçant, le livreur (si assigné), et la plateforme.
 * Crée une seule ligne Review par commande (orderId est unique — voir
 * prisma/schema.prisma) et met à jour au passage les moyennes affichées
 * (Pro.rating/ratingCount, Rider.rating/ratingCount) : personne d'autre
 * n'écrit ces compteurs aujourd'hui, donc c'est cette route qui en est la
 * seule source de vérité.
 *
 * GET /api/orders/[orderId]/review renvoie l'avis existant (ou null) pour
 * que l'app Client sache si la commande a déjà été notée avant d'afficher
 * le formulaire.
 */
async function postHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.CLIENT]);

  const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
  if (!client) {
    throw new ApiError(404, "Profil client introuvable.");
  }

  const order = await prisma.order.findUnique({ where: { id: ctx.params.orderId } });
  if (!order || order.clientId !== client.id) {
    throw new ApiError(404, "Commande introuvable.");
  }
  if (order.status !== OrderStatus.DELIVERED) {
    throw new ApiError(400, "Cette commande n'a pas encore été livrée.");
  }

  const existing = await prisma.review.findUnique({ where: { orderId: order.id } });
  if (existing) {
    throw new ApiError(409, "Vous avez déjà laissé un avis pour cette commande.");
  }

  const body = await req.json().catch(() => null);
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }
  const { productRating, proRating, riderRating, platformRating, comment } = parsed.data;

  // riderRating n'est pris en compte que si un livreur est réellement
  // rattaché à la commande — évite de fausser la moyenne d'un livreur au
  // hasard si l'app envoyait quand même une valeur par défaut.
  const effectiveRiderRating = order.riderId ? riderRating ?? null : null;

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        clientId: client.id,
        proId: order.proId,
        riderId: order.riderId,
        orderId: order.id,
        rating: proRating,
        productRating,
        riderRating: effectiveRiderRating,
        platformRating,
        comment,
      },
    });

    const pro = await tx.pro.findUnique({ where: { id: order.proId }, select: { rating: true, ratingCount: true } });
    if (pro) {
      const newCount = pro.ratingCount + 1;
      const newAverage = (Number(pro.rating ?? 0) * pro.ratingCount + proRating) / newCount;
      await tx.pro.update({ where: { id: order.proId }, data: { rating: newAverage, ratingCount: newCount } });
    }

    if (order.riderId && effectiveRiderRating !== null) {
      const rider = await tx.rider.findUnique({ where: { id: order.riderId }, select: { rating: true, ratingCount: true } });
      if (rider) {
        const newCount = rider.ratingCount + 1;
        const newAverage = (Number(rider.rating ?? 0) * rider.ratingCount + effectiveRiderRating) / newCount;
        await tx.rider.update({ where: { id: order.riderId }, data: { rating: newAverage, ratingCount: newCount } });
      }
    }

    return created;
  });

  return NextResponse.json({ review }, { status: 201 });
}

async function getHandler(req: NextRequest, ctx: { params: { orderId: string } }) {
  const auth = await requireAuth(req, [UserRole.CLIENT]);

  const client = await prisma.client.findUnique({ where: { userId: auth.userId } });
  if (!client) {
    throw new ApiError(404, "Profil client introuvable.");
  }

  const review = await prisma.review.findUnique({ where: { orderId: ctx.params.orderId } });
  if (review && review.clientId !== client.id) {
    // Ne devrait jamais arriver (orderId appartient toujours à un seul
    // client), mais on ne renvoie jamais l'avis d'un autre client par sécurité.
    throw new ApiError(404, "Avis introuvable.");
  }

  return NextResponse.json({ review: review ?? null });
}

export const POST = withErrorHandling(postHandler);
export const GET = withErrorHandling(getHandler);
'@
Write-FileUtf8NoBom -Path "apps/api/src/app/api/orders/[orderId]/review/route.ts" -Content $reviewRoute

# ============================================================================
# 7. apps/livreur -- services
# ============================================================================

Update-FileContent -Path "apps/livreur/src/services/ridersApi.ts" `
  -Old @'
/** PATCH /api/orders/[orderId]/status */
export async function updateOrderStatus(orderId: string, status: string, note?: string): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status, note },
  });
  return data.order;
}
'@ `
  -New @'
/** PATCH /api/orders/[orderId]/status */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  extra?: { note?: string; deliveryPhoto?: string; deliveryCode?: string }
): Promise<Order> {
  const data = await apiFetch<{ order: Order }>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    body: { status, ...extra },
  });
  return data.order;
}
'@

Update-FileContent -Path "apps/livreur/src/services/uploadsApi.ts" `
  -Old @'
  const { data } = supabase.storage.from("kyc-documents").getPublicUrl(path);
  return data.publicUrl;
}
'@ `
  -New @'
  const { data } = supabase.storage.from("kyc-documents").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Upload la photo prouvant la remise d'une commande au client — bucket
 * dédié "delivery-proofs" (à créer côté Supabase Storage, voir README),
 * séparé de "avatars"/"kyc-documents" pour ne jamais mélanger ces preuves
 * avec des photos de profil ou des documents d'identité. Chemin
 * "{orderId}/proof.ext" : une seule preuve conservée par commande.
 */
export async function uploadDeliveryProof(orderId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new UploadError("Photo trop lourde (2 Mo maximum).");
  }

  const ext = extensionFromUri(localUri);
  const contentType = blob.type || mimeTypeForExtension(ext);

  const supabase = getSupabaseClient();
  const path = `${orderId}/proof.${ext}`;

  const { error } = await supabase.storage.from("delivery-proofs").upload(path, blob, {
    upsert: true,
    contentType,
  });

  if (error) {
    throw new UploadError(`Échec de l'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from("delivery-proofs").getPublicUrl(path);
  return data.publicUrl;
}
'@

# ============================================================================
# 8. apps/livreur -- store (avancer d'une etape avec preuve de remise)
# ============================================================================

Update-FileContent -Path "apps/livreur/src/store/useRiderSessionStore.ts" `
  -Old @'
  advanceDeliveryStep: () => Promise<void>;
'@ `
  -New @'
  advanceDeliveryStep: (proof?: { deliveryPhoto?: string; deliveryCode?: string }) => Promise<void>;
'@

Update-FileContent -Path "apps/livreur/src/store/useRiderSessionStore.ts" `
  -Old @'
  advanceDeliveryStep: async () => {
    const current = get().activeDelivery;
    if (!current) return;

    const currentIndex = DELIVERY_FLOW.indexOf(current.status);
    const nextStatus = DELIVERY_FLOW[currentIndex + 1];
    if (!nextStatus) return;

    const updated = await updateOrderStatus(current.id, nextStatus);
'@ `
  -New @'
  advanceDeliveryStep: async (proof) => {
    const current = get().activeDelivery;
    if (!current) return;

    const currentIndex = DELIVERY_FLOW.indexOf(current.status);
    const nextStatus = DELIVERY_FLOW[currentIndex + 1];
    if (!nextStatus) return;

    const updated = await updateOrderStatus(current.id, nextStatus, proof);
'@

# ============================================================================
# 9. apps/livreur -- CurrentDeliveryCard.tsx (reecriture complete : appel
#    client, compte a rebours, ecran allume, preuve de remise)
# ============================================================================

$currentDeliveryCard = @'
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, Linking, Platform } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { OrderStatus } from "@golfeexpress/types";
import { useRiderSessionStore } from "@/store/useRiderSessionStore";
import { getCategoryEmoji } from "@/services/categoryVisuals";
import { DocumentPhotoField } from "@/components/DocumentPhotoField";
import { uploadDeliveryProof } from "@/services/uploadsApi";

const STEP_LABELS = ["Assignée", "Récupérée", "En route", "Livrée"];
const DELIVERY_FLOW: OrderStatus[] = [
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_DELIVERY,
  OrderStatus.DELIVERED,
];

const ACTION_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.RIDER_ASSIGNED]: "📦 J'ai récupéré la commande",
  [OrderStatus.PICKED_UP]: "📍 J'arrive chez le client",
  [OrderStatus.IN_DELIVERY]: "🎉 Commande livrée !",
} as Record<OrderStatus, string>;

/**
 * Ouvre l'app de navigation (Google Maps sur Android, Apple/Google Maps au
 * choix de l'utilisateur sur iOS) avec un itinéraire vers les coordonnées
 * données. On utilise le schéma d'URL universel Google Maps (fonctionne
 * aussi bien en ouvrant l'app native si installée qu'en fallback web sinon).
 */
function openDirections(lat: number, lng: number, label?: string) {
  const query = `${lat},${lng}`;
  const url =
    Platform.OS === "ios"
      ? `maps://?daddr=${query}&dirflg=d`
      : `google.navigation:q=${query}&mode=d`;
  const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}${
    label ? `&destination_place_id=${encodeURIComponent(label)}` : ""
  }`;

  Linking.canOpenURL(url)
    .then((supported) => Linking.openURL(supported ? url : fallbackUrl))
    .catch(() => Linking.openURL(fallbackUrl));
}

function callClient(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {});
}

/** "12 min restantes" / "en retard de 4 min" — recalculé périodiquement (voir useEffect ci-dessous). */
function formatCountdown(estimatedDelivery: string): { label: string; isLate: boolean } {
  const remainingMs = new Date(estimatedDelivery).getTime() - Date.now();
  const remainingMin = Math.round(remainingMs / 60_000);
  if (remainingMin >= 0) {
    return { label: `⏱️ ${remainingMin} min restantes`, isLate: false };
  }
  return { label: `⚠️ En retard de ${Math.abs(remainingMin)} min`, isLate: true };
}

export function CurrentDeliveryCard() {
  const activeDelivery = useRiderSessionStore((s) => s.activeDelivery);
  const advanceDeliveryStep = useRiderSessionStore((s) => s.advanceDeliveryStep);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bilan de livraison — demandé juste avant de confirmer "Commande
  // livrée", jamais pour les étapes précédentes (récupération, en route).
  const [showProofPanel, setShowProofPanel] = useState(false);
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);
  const [proofCode, setProofCode] = useState("");

  // Recalcule l'affichage du compte à rebours toutes les 15s — un simple
  // compteur de rendu suffit, formatCountdown relit l'heure actuelle à
  // chaque appel.
  const [, forceTick] = useState(0);

  // Tant qu'une livraison est en cours, on empêche l'écran de s'éteindre —
  // essentiel pour garder le GPS et le compte à rebours visibles pendant
  // que le livreur roule (téléphone souvent posé sur un support, pas en main).
  useKeepAwake();

  useEffect(() => {
    if (!activeDelivery?.estimatedDelivery) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, [activeDelivery?.estimatedDelivery]);

  if (!activeDelivery) return null;

  const stepIndex = DELIVERY_FLOW.indexOf(activeDelivery.status);
  const emoji = activeDelivery.pro ? getCategoryEmoji(activeDelivery.pro.category) : "🏪";
  const routeLabel = `${activeDelivery.fromAddress?.city ?? "?"} → ${activeDelivery.toAddress?.city ?? "?"}`;

  // Avant récupération -> direction le commerçant. Après -> direction le client.
  const isHeadingToPickup = activeDelivery.status === OrderStatus.RIDER_ASSIGNED;
  const destinationAddress = isHeadingToPickup ? activeDelivery.fromAddress : activeDelivery.toAddress;

  // Cas de la recherche anticipée : le livreur a été assigné PENDANT la
  // préparation et peut être en route, mais la commande n'est pas encore
  // physiquement prête (le Pro n'a pas encore cliqué "Marquer prête") — on
  // bloque l'action "récupéré" tant que ce n'est pas le cas, pour éviter
  // une confirmation prématurée.
  const isWaitingForFoodToBeReady = activeDelivery.status === OrderStatus.RIDER_ASSIGNED && !activeDelivery.readyAt;

  // Le client n'est appelable qu'une fois la commande récupérée — avant
  // ça, le trajet ne le concerne pas encore.
  const clientPhone = activeDelivery.client?.user?.phone ?? null;
  const canCallClient =
    (activeDelivery.status === OrderStatus.PICKED_UP || activeDelivery.status === OrderStatus.IN_DELIVERY) &&
    !!clientPhone;

  const countdown =
    (activeDelivery.status === OrderStatus.PICKED_UP || activeDelivery.status === OrderStatus.IN_DELIVERY) &&
    activeDelivery.estimatedDelivery
      ? formatCountdown(activeDelivery.estimatedDelivery)
      : null;

  const isFinalStep = activeDelivery.status === OrderStatus.IN_DELIVERY;

  async function handleAction() {
    // Dernière étape (marquer livré) : on demande d'abord une preuve de
    // remise (photo et/ou code) plutôt que de clôturer directement.
    if (isFinalStep && !showProofPanel) {
      setShowProofPanel(true);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await advanceDeliveryStep(
        isFinalStep
          ? { deliveryPhoto: proofPhotoUrl ?? undefined, deliveryCode: proofCode.trim() || undefined }
          : undefined
      );
      setShowProofPanel(false);
      setProofPhotoUrl(null);
      setProofCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadProof(localUri: string) {
    const url = await uploadDeliveryProof(activeDelivery!.id, localUri);
    setProofPhotoUrl(url);
  }

  function handleDirections() {
    if (!destinationAddress) return;
    openDirections(Number(destinationAddress.lat), Number(destinationAddress.lng), destinationAddress.street);
  }

  return (
    <View style={[styles.card, { backgroundColor: "#1A1A2E" }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🛵 Livraison en cours</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeDelivery.orderNumber}</Text>
        </View>
      </View>

      <View style={styles.proRow}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 24 }}>{emoji}</Text>
        </View>
        <View>
          <Text style={styles.proName}>{activeDelivery.pro?.businessName ?? "Commerçant"}</Text>
          <Text style={styles.routeLabel}>{routeLabel}</Text>
        </View>
        <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
          <Text style={styles.earnings}>{Number(activeDelivery.riderEarnings).toFixed(2).replace(".", ",")}€</Text>
        </View>
      </View>

      {countdown && (
        <View style={[styles.countdownBox, countdown.isLate && styles.countdownBoxLate]}>
          <Text style={[styles.countdownText, countdown.isLate && styles.countdownTextLate]}>{countdown.label}</Text>
        </View>
      )}

      {destinationAddress && (
        <Pressable onPress={handleDirections} style={styles.directionsBtn}>
          <Text style={{ fontSize: 16 }}>🧭</Text>
          <Text style={styles.directionsText}>
            {isHeadingToPickup ? "Itinéraire vers le commerçant" : "Itinéraire vers le client"}
          </Text>
        </Pressable>
      )}

      {canCallClient && clientPhone && (
        <Pressable onPress={() => callClient(clientPhone)} style={[styles.directionsBtn, styles.callBtn]}>
          <Text style={{ fontSize: 16 }}>📞</Text>
          <Text style={[styles.directionsText, { color: "white" }]}>Appeler le client</Text>
        </Pressable>
      )}

      {isWaitingForFoodToBeReady && (
        <View style={styles.waitingBox}>
          <Text style={styles.waitingText}>👨‍🍳 Commande en préparation — vous pouvez déjà vous mettre en route</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.stepsRow}>
        {STEP_LABELS.map((label, i) => {
          const isCompleted = i < stepIndex;
          const isActive = i === stepIndex;
          return (
            <View key={label} style={styles.step}>
              <View
                style={[
                  styles.stepDot,
                  { backgroundColor: isCompleted ? "#2ECC71" : isActive ? "#FF6B35" : "rgba(255,255,255,0.1)" },
                ]}
              >
                {isCompleted && <Text style={{ fontSize: 14, color: "white", fontWeight: "700" }}>✓</Text>}
              </View>
              <Text style={[styles.stepLabel, { color: isCompleted || isActive ? "white" : "rgba(255,255,255,0.5)" }]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {showProofPanel && (
        <View style={styles.proofPanel}>
          <Text style={styles.proofTitle}>Preuve de remise (optionnel)</Text>
          <View style={styles.proofPhotoWrap}>
            <DocumentPhotoField label="Photo de la remise" onUpload={handleUploadProof} />
          </View>
          <Text style={styles.proofLabel}>Code de remise donné par le client</Text>
          <TextInput
            value={proofCode}
            onChangeText={setProofCode}
            placeholder="Ex: 4821"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.proofInput}
          />
        </View>
      )}

      <Pressable
        onPress={handleAction}
        disabled={submitting || isWaitingForFoodToBeReady}
        style={[styles.actionBtn, { opacity: submitting || isWaitingForFoodToBeReady ? 0.5 : 1 }]}
      >
        <Text style={styles.actionText}>
          {isWaitingForFoodToBeReady
            ? "⏳ En attente que ce soit prêt..."
            : showProofPanel
              ? "✅ Confirmer la livraison"
              : ACTION_LABELS[activeDelivery.status] ?? "Continuer"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 20 },
  headerRow: { marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: "700", color: "white" },
  badge: { borderRadius: 999, backgroundColor: "#F97316", paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "white" },
  proRow: { marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { height: 50, width: 50, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: "#F97316" },
  proName: { fontWeight: "700", color: "white" },
  routeLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  earnings: { fontSize: 20, fontWeight: "800", color: "white" },
  countdownBox: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "rgba(46,204,113,0.15)",
    paddingVertical: 10,
    alignItems: "center",
  },
  countdownBoxLate: { backgroundColor: "rgba(239,68,68,0.15)" },
  countdownText: { fontSize: 13, fontWeight: "700", color: "#2ECC71" },
  countdownTextLate: { color: "#FCA5A5" },
  directionsBtn: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    backgroundColor: "white",
    paddingVertical: 12,
  },
  callBtn: { marginBottom: 16, backgroundColor: "#2ECC71" },
  directionsText: { fontSize: 14, fontWeight: "700", color: "#1A1A2E" },
  waitingBox: { marginBottom: 16, borderRadius: 8, backgroundColor: "rgba(255,107,53,0.15)", padding: 12 },
  waitingText: { fontSize: 13, fontWeight: "600", color: "#FF6B35" },
  errorBox: { marginBottom: 12, borderRadius: 4, backgroundColor: "rgba(239,68,68,0.1)", padding: 12 },
  errorText: { fontSize: 13, color: "#FCA5A5" },
  stepsRow: { marginBottom: 16, flexDirection: "row", justifyContent: "space-between" },
  step: { flex: 1, alignItems: "center" },
  stepDot: { height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: 999 },
  stepLabel: { marginTop: 4, textAlign: "center", fontSize: 10 },
  proofPanel: { marginBottom: 16, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)", padding: 12 },
  proofTitle: { marginBottom: 10, fontSize: 13, fontWeight: "700", color: "white" },
  proofPhotoWrap: { borderRadius: 8, backgroundColor: "white", padding: 10, marginBottom: 4 },
  proofLabel: { marginTop: 4, marginBottom: 6, fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  proofInput: {
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "white",
    fontSize: 14,
  },
  actionBtn: { alignItems: "center", borderRadius: 8, backgroundColor: "#2ECC71", paddingVertical: 14 },
  actionText: { fontWeight: "700", color: "white" },
});
'@
Write-FileUtf8NoBom -Path "apps/livreur/src/components/CurrentDeliveryCard.tsx" -Content $currentDeliveryCard

# ============================================================================
# 10. apps/client -- NOUVEAUX fichiers (avis)
# ============================================================================

$clientReviewsApi = @'
import { apiFetch } from "@/services/apiClient";
import type { Review } from "@golfeexpress/types";

export interface CreateReviewInput {
  productRating: number;
  proRating: number;
  riderRating?: number;
  platformRating: number;
  comment?: string;
}

/** POST /api/orders/[orderId]/review */
export async function createReview(orderId: string, input: CreateReviewInput): Promise<Review> {
  const data = await apiFetch<{ review: Review }>(`/api/orders/${orderId}/review`, {
    method: "POST",
    body: input,
  });
  return data.review;
}

/** GET /api/orders/[orderId]/review — renvoie l'avis existant, ou null si la commande n'a pas encore été notée. */
export async function fetchOrderReview(orderId: string): Promise<Review | null> {
  const data = await apiFetch<{ review: Review | null }>(`/api/orders/${orderId}/review`);
  return data.review;
}
'@
Write-FileUtf8NoBom -Path "apps/client/src/services/reviewsApi.ts" -Content $clientReviewsApi

$reviewScreen = @'
import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator, Share, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Order } from "@golfeexpress/types";
import { createReview, fetchOrderReview } from "@/services/reviewsApi";

interface ReviewScreenProps {
  order: Order;
  onClose: () => void;
}

interface StarRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function StarRow({ label, value, onChange }: StarRowProps) {
  return (
    <View style={styles.starRow}>
      <Text style={styles.starRowLabel}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
            <Text style={{ fontSize: 26, color: n <= value ? "#FF6B35" : "#E5E7EB" }}>★</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/**
 * Écran de notation post-livraison — ouvert soit depuis "Mes commandes"
 * (bouton "Avis" sur une commande livrée), soit via le lien
 * ?screen=review&orderId=... du mail "Commande livrée" (voir App.tsx).
 * Une seule note par commande (orderId est unique côté API) : si un avis
 * existe déjà, on l'affiche en lecture seule plutôt que de permettre un
 * second envoi.
 */
export function ReviewScreen({ order, onClose }: ReviewScreenProps) {
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const [productRating, setProductRating] = useState(0);
  const [proRating, setProRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);
  const [platformRating, setPlatformRating] = useState(0);
  const [comment, setComment] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const hasRider = !!order.riderId;

  useEffect(() => {
    fetchOrderReview(order.id)
      .then((existing) => {
        if (existing) setAlreadyReviewed(true);
      })
      .catch(() => {
        // Pas bloquant — si la vérification échoue, on laisse simplement le
        // formulaire ouvert ; un doublon serait de toute façon refusé par l'API.
      })
      .finally(() => setLoadingExisting(false));
  }, [order.id]);

  const canSubmit = productRating > 0 && proRating > 0 && platformRating > 0 && (!hasRider || riderRating > 0);

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await createReview(order.id, {
        productRating,
        proRating,
        riderRating: hasRider ? riderRating : undefined,
        platformRating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'envoyer votre avis pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShare() {
    try {
      const productNames = order.items?.map((i) => i.productName).join(", ");
      await Share.share({
        message: `Je viens de commander ${productNames ? `${productNames} ` : ""}chez ${
          order.pro?.businessName ?? "un commerçant local"
        } avec Do You Geckoo, livré en moins de 30 minutes. À essayer : https://www.doyougeckoo.fr`,
      });
    } catch {
      // Partage annulé/impossible — pas grave, on n'affiche pas d'erreur pour ça.
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top", "bottom"]}>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-4">
        <Text className="font-heading text-xl font-bold text-nuit">⭐ Votre avis</Text>
        <Pressable onPress={onClose}>
          <Text style={{ fontSize: 15, color: "#6B7280" }}>Fermer</Text>
        </Pressable>
      </View>

      {loadingExisting ? (
        <View className="items-center py-16">
          <ActivityIndicator color="#2ECC71" />
        </View>
      ) : alreadyReviewed && !submitted ? (
        <View className="items-center px-8 py-16">
          <Text style={{ fontSize: 40 }}>🙏</Text>
          <Text className="mt-3 text-center text-gris">Vous avez déjà laissé un avis pour cette commande — merci !</Text>
        </View>
      ) : submitted ? (
        <View className="items-center px-8 py-16">
          <Text style={{ fontSize: 40 }}>🎉</Text>
          <Text className="mt-3 text-center font-heading text-lg font-bold text-nuit">Merci pour votre avis !</Text>
          <Text className="mt-2 text-center text-sm text-gris">
            Ça aide {order.pro?.businessName ?? "ce commerçant"} et votre livreur à s'améliorer.
          </Text>
          <Pressable onPress={handleShare} className="mt-6 rounded-full bg-golfe-green px-6 py-3">
            <Text className="text-sm font-bold text-nuit">📤 Partager Do You Geckoo</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 32 }}>
          <Text className="mb-4 text-sm text-gris">
            Commande {order.orderNumber} chez {order.pro?.businessName ?? "ce commerçant"}
          </Text>

          <StarRow label="Le produit" value={productRating} onChange={setProductRating} />
          <StarRow label={order.pro?.businessName ?? "Le commerçant"} value={proRating} onChange={setProRating} />
          {hasRider && <StarRow label="Le livreur" value={riderRating} onChange={setRiderRating} />}
          <StarRow label="Do You Geckoo" value={platformRating} onChange={setPlatformRating} />

          <Text className="mb-2 mt-4 text-xs font-semibold text-nuit">Un commentaire ? (optionnel)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Votre expérience en quelques mots..."
            multiline
            numberOfLines={3}
            style={styles.commentInput}
          />

          {error && <Text className="mt-3 text-sm text-red-500">{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{
              marginTop: 20,
              borderRadius: 999,
              backgroundColor: "#2ECC71",
              paddingVertical: 14,
              alignItems: "center",
              opacity: !canSubmit || submitting ? 0.5 : 1,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#1A1A2E" }}>{submitting ? "Envoi..." : "Envoyer mon avis"}</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  starRow: { marginBottom: 18 },
  starRowLabel: { marginBottom: 8, fontSize: 13, fontWeight: "700", color: "#1A1A2E" },
  commentInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 80,
  },
});
'@
Write-FileUtf8NoBom -Path "apps/client/src/screens/ReviewScreen.tsx" -Content $reviewScreen

# ============================================================================
# 11. apps/client -- OrdersScreen.tsx (bouton "Avis" sur une commande livrée)
# ============================================================================

$clientOrdersScreenPath = "apps/client/src/screens/OrdersScreen.tsx"

Update-FileContent -Path $clientOrdersScreenPath `
  -Old @'
interface OrdersScreenProps {
  onOpenTracking: (order: Order) => void;
  onReorder: (order: Order) => void;
}

export function OrdersScreen({ onOpenTracking, onReorder }: OrdersScreenProps) {
'@ `
  -New @'
interface OrdersScreenProps {
  onOpenTracking: (order: Order) => void;
  onReorder: (order: Order) => void;
  onOpenReview: (order: Order) => void;
}

export function OrdersScreen({ onOpenTracking, onReorder, onOpenReview }: OrdersScreenProps) {
'@

Update-FileContent -Path $clientOrdersScreenPath `
  -Old @'
            filtered.map((order) => {
              const isActive = ACTIVE_STATUSES.includes(order.status);
              const visual = order.pro ? getCategoryVisual(order.pro.category) : null;
'@ `
  -New @'
            filtered.map((order) => {
              const isActive = ACTIVE_STATUSES.includes(order.status);
              const isDelivered = order.status === OrderStatus.DELIVERED;
              const visual = order.pro ? getCategoryVisual(order.pro.category) : null;
'@

Update-FileContent -Path $clientOrdersScreenPath `
  -Old @'
                    {isActive ? (
                      <Pressable
                        onPress={() => onOpenTracking(order)}
                        className="flex-row items-center gap-1.5 rounded-sm bg-golfe-green px-3.5 py-2"
                      >
                        <Text style={{ fontSize: 12 }}>🧭</Text>
                        <Text className="text-xs font-bold text-white">Suivre</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => onReorder(order)}
                        className="flex-row items-center gap-1.5 rounded-sm border-2 border-gris-light px-3.5 py-2"
                      >
                        <Text style={{ fontSize: 12 }}>🔄</Text>
                        <Text className="text-xs font-semibold text-nuit">Recommander</Text>
                      </Pressable>
                    )}
'@ `
  -New @'
                    {isActive ? (
                      <Pressable
                        onPress={() => onOpenTracking(order)}
                        className="flex-row items-center gap-1.5 rounded-sm bg-golfe-green px-3.5 py-2"
                      >
                        <Text style={{ fontSize: 12 }}>🧭</Text>
                        <Text className="text-xs font-bold text-white">Suivre</Text>
                      </Pressable>
                    ) : (
                      <View className="flex-row items-center gap-2">
                        {isDelivered && (
                          <Pressable
                            onPress={() => onOpenReview(order)}
                            className="flex-row items-center gap-1.5 rounded-sm bg-corail px-3.5 py-2"
                          >
                            <Text style={{ fontSize: 12 }}>⭐</Text>
                            <Text className="text-xs font-bold text-white">Avis</Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => onReorder(order)}
                          className="flex-row items-center gap-1.5 rounded-sm border-2 border-gris-light px-3.5 py-2"
                        >
                          <Text style={{ fontSize: 12 }}>🔄</Text>
                          <Text className="text-xs font-semibold text-nuit">Recommander</Text>
                        </Pressable>
                      </View>
                    )}
'@

# ============================================================================
# 12. apps/client -- App.tsx (deep-link mail + modal ReviewScreen)
# ============================================================================

$clientAppPath = "apps/client/App.tsx"

Update-FileContent -Path $clientAppPath `
  -Old @'
import { OrdersScreen } from "@/screens/OrdersScreen";
import { FidelityScreen } from "@/screens/FidelityScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import type { ProWithUi } from "@/services/prosApi";
import { fetchPros } from "@/services/prosApi";
import { useCartStore } from "@/store/useCartStore";
'@ `
  -New @'
import { OrdersScreen } from "@/screens/OrdersScreen";
import { FidelityScreen } from "@/screens/FidelityScreen";
import { ProfileScreen } from "@/screens/ProfileScreen";
import { ReviewScreen } from "@/screens/ReviewScreen";
import type { ProWithUi } from "@/services/prosApi";
import { fetchPros } from "@/services/prosApi";
import { fetchMyOrders } from "@/services/ordersApi";
import { useCartStore } from "@/store/useCartStore";
'@

Update-FileContent -Path $clientAppPath `
  -Old @'
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
'@ `
  -New @'
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
'@

Update-FileContent -Path $clientAppPath `
  -Old @'
    fetchPros()
      .then((pros) => {
        const match = pros.find((p) => p.id === proId);
        if (match) {
          setSelectedPro(match);
          setDeepLinkProductId(productId);
        }
      })
      .catch(() => {
        /* lien invalide/expiré : on laisse simplement l'utilisateur sur l'accueil */
      });
  }, []);
'@ `
  -New @'
    fetchPros()
      .then((pros) => {
        const match = pros.find((p) => p.id === proId);
        if (match) {
          setSelectedPro(match);
          setDeepLinkProductId(productId);
        }
      })
      .catch(() => {
        /* lien invalide/expiré : on laisse simplement l'utilisateur sur l'accueil */
      });
  }, []);

  // Deep-link depuis le mail "Commande livrée" : ?screen=review&orderId=<id>
  // ouvre directement l'écran de notation de cette commande, sans passer
  // par l'onglet Commandes (voir sendOrderDeliveredEmail côté API).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("screen") !== "review") return;
    const orderId = params.get("orderId");
    if (!orderId) return;

    window.history.replaceState({}, "", window.location.pathname);

    fetchMyOrders()
      .then((orders) => {
        const match = orders.find((o) => o.id === orderId);
        if (match) setReviewOrder(match);
      })
      .catch(() => {
        /* lien invalide/expiré : on laisse simplement l'utilisateur sur l'accueil */
      });
  }, []);
'@

Update-FileContent -Path $clientAppPath `
  -Old @'
      case "orders":
        return (
          <OrdersScreen
            onOpenTracking={setTrackingOrder}
            onReorder={handleReorder}
          />
        );
'@ `
  -New @'
      case "orders":
        return (
          <OrdersScreen
            onOpenTracking={setTrackingOrder}
            onReorder={handleReorder}
            onOpenReview={setReviewOrder}
          />
        );
'@

Update-FileContent -Path $clientAppPath `
  -Old @'
      {/* MODAL: Suivi de commande */}
      <Modal visible={!!trackingOrder} animationType="slide" onRequestClose={() => setTrackingOrder(null)}>
        {trackingOrder && <TrackingScreen order={trackingOrder} onClose={() => setTrackingOrder(null)} />}
      </Modal>
'@ `
  -New @'
      {/* MODAL: Suivi de commande */}
      <Modal visible={!!trackingOrder} animationType="slide" onRequestClose={() => setTrackingOrder(null)}>
        {trackingOrder && <TrackingScreen order={trackingOrder} onClose={() => setTrackingOrder(null)} />}
      </Modal>

      {/* MODAL: Notation post-livraison */}
      <Modal visible={!!reviewOrder} animationType="slide" onRequestClose={() => setReviewOrder(null)}>
        {reviewOrder && <ReviewScreen order={reviewOrder} onClose={() => setReviewOrder(null)} />}
      </Modal>
'@

# ============================================================================
# 13. Nettoyage du fichier temporaire cree pour cette session
# ============================================================================

$tmpStatusCopy = "apps/api/src/app/api/orders/_tmp_status_route.ts"
if (Test-Path -LiteralPath $tmpStatusCopy) {
    Remove-Item -LiteralPath $tmpStatusCopy
    Write-Host "Supprime : $tmpStatusCopy (copie temporaire, plus necessaire)"
}

# ============================================================================
Write-Host ""
Write-Host "=== Termine — etapes manuelles restantes ===" -ForegroundColor Green
Write-Host "1. npx prisma migrate dev --name add_review_ratings_and_delivery_penalty"
Write-Host "2. cd apps/livreur ; npx expo install expo-keep-awake ; cd ../.."
Write-Host "3. Cote Supabase Storage : creer le bucket 'delivery-proofs' (public, comme avatars/kyc-documents)"
Write-Host "4. git status / git add -A / git commit / git push"
Write-Host "5. Deployer apps/api, apps/livreur ET apps/client (les trois ont change)"
Write-Host ""

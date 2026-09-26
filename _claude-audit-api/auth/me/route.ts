import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatus, UserRole } from "@golfeexpress/types";
import { requireAuth, withErrorHandling, ApiError } from "@/middleware/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/auth/me
 *
 * Header: Authorization: Bearer <accessToken>
 * Réponse 200: { user, profile } où `profile` est le Client/Pro/Rider/Admin
 * associé selon le rôle de l'utilisateur — c'est cette forme que consomment
 * directement les 4 apps après connexion.
 */
async function getHandler(req: NextRequest) {
  const auth = await requireAuth(req);

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: {
      clientProfile: true,
      proProfile: true,
      riderProfile: true,
      adminProfile: true,
      // Non-null uniquement pour un compte role=PRO_EMPLOYEE -- voir
      // requireProOrEmployee() dans middleware/auth.ts. On inclut la
      // boutique (pro) pour que le profil renvoyé ci-dessous ressemble à un
      // Pro classique côté apps/pro, qui n'a pas à distinguer patron/employé
      // pour son affichage de base (nom de la boutique, logo...).
      employeeOfPro: { include: { pro: true } },
    },
  });

  if (!user) {
    throw new ApiError(404, "Utilisateur introuvable.");
  }

  const { clientProfile, proProfile, riderProfile, adminProfile, employeeOfPro, ...userBase } = user;
  const rawProfile = clientProfile ?? proProfile ?? riderProfile ?? employeeOfPro?.pro ?? adminProfile ?? null;

  // Decimal Prisma (rating, commissionRate, totalEarnings, balance,
  // currentLat/Lng, googleRating...) -> nombres JS, sinon sérialisés en
  // texte côté JSON et cassent silencieusement les calculs/affichages dans
  // les 4 apps qui consomment cette route à la connexion.
  const profile = rawProfile ? serializeDecimalFields(rawProfile) : null;

  // true uniquement pour un compte employé (role PRO_EMPLOYEE) -- apps/pro
  // s'en sert pour masquer Finances/Paramètres/Abonnement/Avis côté client
  // (voir App.tsx / Sidebar.tsx). Ce flag seul ne protège rien : chaque
  // route sensible côté API doit rester filtrée sur le rôle réel via
  // requireAuth(req, [UserRole.PRO]), jamais sur ce booléen.
  const isEmployee = !!employeeOfPro;

  return NextResponse.json({ user: userBase, profile, isEmployee });
}

/**
 * Convertit récursivement (1 niveau) tout champ Decimal Prisma en nombre
 * JS. Générique plutôt que spécifique à un modèle car cette route renvoie
 * indifféremment un Client, Pro, Rider ou Admin.
 */
function serializeDecimalFields<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(result)) {
    const value = result[key];
    // Les valeurs Decimal de Prisma exposent toujours .toNumber() — on
    // s'en sert comme détection plutôt que de lister les champs un par un.
    if (value !== null && typeof value === "object" && typeof (value as { toNumber?: unknown }).toNumber === "function") {
      result[key] = (value as { toNumber: () => number }).toNumber();
    }
  }
  return result as T;
}

const updateMeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  avatar: z.string().nullable().optional(),
});

/**
 * PATCH /api/auth/me
 *
 * Met à jour les champs de base de public."User" — utilisé notamment pour
 * l'avatar (photo de profil), commun aux 4 rôles. Volontairement restreint
 * à firstName/lastName/avatar : email/phone/role changent via des flows
 * dédiés (vérification, validation admin) plutôt qu'une simple édition libre.
 */
async function patchHandler(req: NextRequest) {
  const auth = await requireAuth(req);

  const body = await req.json().catch(() => null);
  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues.map((i) => i.message).join(" "));
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data: parsed.data,
  });

  return NextResponse.json({ user });
}

// Statuts non-terminaux d'une commande -- voir OrderStatus dans
// prisma/schema.prisma. Tant qu'une commande est dans l'un de ces états,
// il y a un Client/Pro/Rider concret de l'autre côté qui compte dessus :
// on ne laisse jamais quelqu'un supprimer son compte au milieu d'une
// course, ça laisserait une commande orpheline sans personne pour la
// finaliser ni répondre en cas de souci.
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.RIDER_ASSIGNED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_DELIVERY,
];

/**
 * DELETE /api/auth/me
 *
 * Suppression de compte en libre-service (Client, Pro ou Livreur -- pas
 * Admin, volontairement exclu ci-dessous). Anonymise plutôt que de
 * supprimer réellement les lignes User/Client/Pro/Rider : Order.client /
 * Order.pro / Order.rider sont des relations obligatoires (pas de FK
 * nullable), donc supprimer la ligne casserait l'historique des commandes
 * déjà passées -- qu'on doit de toute façon conserver pour nos obligations
 * comptables (factures, ~10 ans en France). On efface donc uniquement les
 * champs identifiants (nom, email, téléphone, avatar, documents...) et on
 * verrouille le compte (status suspendu -> requireAuth le bloque
 * immédiatement, voir middleware/auth.ts), ce qui revient au même pour
 * l'utilisateur : il ne peut plus se connecter ni être identifié.
 *
 * NOTE (limite connue) : ceci anonymise uniquement les données en base.
 * Les fichiers déjà uploadés dans Supabase Storage (photo de profil,
 * selfie de vérification, pièce d'identité, Kbis...) ne sont PAS purgés
 * automatiquement par cette route -- à traiter séparément (script admin)
 * si une suppression complète de ces fichiers est nécessaire.
 */
async function deleteHandler(req: NextRequest) {
  const auth = await requireAuth(req);

  if (auth.role === UserRole.ADMIN || auth.role === UserRole.SUPER_ADMIN) {
    throw new ApiError(403, "La suppression de compte n'est pas disponible pour les comptes admin depuis cette route.");
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { clientProfile: true, proProfile: true, riderProfile: true },
  });
  if (!user) {
    throw new ApiError(404, "Utilisateur introuvable.");
  }

  const activeOrderWhere = user.clientProfile
    ? { clientId: user.clientProfile.id, status: { in: ACTIVE_ORDER_STATUSES } }
    : user.proProfile
      ? { proId: user.proProfile.id, status: { in: ACTIVE_ORDER_STATUSES } }
      : user.riderProfile
        ? { riderId: user.riderProfile.id, status: { in: ACTIVE_ORDER_STATUSES } }
        : null;

  if (activeOrderWhere) {
    const activeOrderCount = await prisma.order.count({ where: activeOrderWhere });
    if (activeOrderCount > 0) {
      throw new ApiError(
        409,
        "Impossible de supprimer votre compte : vous avez une commande en cours. Attendez qu'elle soit terminée (livrée ou annulée) avant de réessayer."
      );
    }
  }

  // Résilie tout de suite l'abonnement Stripe payant du Pro (pas de
  // cancel_at_period_end ici, contrairement à /pros/me/subscription/cancel
  // -- une suppression de compte doit couper l'accès immédiatement, pas
  // continuer à facturer jusqu'à la fin de la période). Ne bloque jamais la
  // suppression si Stripe répond mal : le compte doit pouvoir être
  // verrouillé même si Stripe est indisponible.
  if (user.proProfile?.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(user.proProfile.stripeSubscriptionId);
    } catch (err) {
      console.error("[auth/me DELETE] échec résiliation abonnement Stripe:", err);
    }
  }

  const anonEmail = `deleted+${user.id}@doyougeckoo.fr`;
  const anonPhone = `deleted-${user.id}`;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        firstName: "Compte",
        lastName: "supprimé",
        email: anonEmail,
        phone: anonPhone,
        avatar: null,
        status: "SUSPENDED",
      },
    });

    if (user.proProfile) {
      await tx.pro.update({
        where: { id: user.proProfile.id },
        data: {
          status: "CLOSED",
          phone: anonPhone,
          emailContact: anonEmail,
          managerFirstName: null,
          managerLastName: null,
          logo: null,
          coverImage: null,
          kbisUrl: null,
          description: null,
          instagramUrl: null,
          facebookUrl: null,
          tiktokUrl: null,
          websiteUrl: null,
          stripeSubscriptionId: null,
          subscriptionStatus: null,
          subscriptionType: "FREE",
        },
      });
    }

    if (user.riderProfile) {
      await tx.rider.update({
        where: { id: user.riderProfile.id },
        data: {
          status: "SUSPENDED",
          isOnline: false,
          profilePhotoUrl: null,
          verificationSelfieUrl: null,
          idCardFront: "",
          idCardBack: "",
          iban: "",
          street: null,
          zipCode: null,
          city: null,
          birthDate: null,
        },
      });
    }
  });

  return NextResponse.json({ deleted: true });
}

export const GET = withErrorHandling(getHandler);
export const PATCH = withErrorHandling(patchHandler);
export const DELETE = withErrorHandling(deleteHandler);

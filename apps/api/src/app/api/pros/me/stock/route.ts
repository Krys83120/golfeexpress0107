import { NextRequest, NextResponse } from "next/server";
import { NotificationType } from "@golfeexpress/types";
import { prisma } from "@/lib/prisma";
import { requireProOrEmployee, withErrorHandling, ApiError } from "@/middleware/auth";
import { updateStockSchema } from "@/lib/validation/stock";
import { sendStockOutAlertToProEmail } from "@/lib/emails/stockEmails";
import { sendPushToPro } from "@/lib/webPush";

/**
 * GET /api/pros/me/stock -- catalogue complet (produits + choix d'options)
 * du Pro courant, avec uniquement les champs nécessaires à l'onglet Stock
 * (jamais le prix -- pas pertinent ici, et évite de sérialiser des champs
 * Decimal, voir serializeProduct.ts pour le problème que ça évite).
 * Accessible au patron ET à l'employé (voir requireProOrEmployee) -- utilisé
 * aussi par le Dashboard du patron pour le bandeau "en rupture".
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const { proId } = await requireProOrEmployee(req);

  const products = await prisma.product.findMany({
    where: { proId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      image: true,
      isAvailable: true,
      unavailableUntil: true,
      options: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          choices: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, isAvailable: true, unavailableUntil: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ products });
});

/**
 * PATCH /api/pros/me/stock -- coche/décoche la rupture d'un produit entier
 * ou d'un choix d'option précis ("ingrédient"). Toujours une bascule
 * MANUELLE (unavailableUntil remis à null au passage, voir le commentaire
 * sur Product.unavailableUntil dans prisma/schema.prisma) : le Cron
 * quotidien /api/cron/reset-product-availability ne la concerne donc pas.
 *
 * Quand l'auteur est un EMPLOYÉ (jamais quand c'est le patron lui-même --
 * inutile de l'alerter de ses propres actions) :
 *  - mise en rupture  -> email au patron (sendStockOutAlertToProEmail)
 *  - retour en stock  -> notification push au patron (sendPushToPro)
 * Dans les deux cas une ligne Notification est aussi créée (lue nulle part
 * encore côté app Pro à ce jour, mais prépare un futur centre de
 * notifications sans migration supplémentaire).
 */
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const auth = await requireProOrEmployee(req);
  const body = updateStockSchema.parse(await req.json());

  let itemName: string;
  let itemContext: string | null = null;

  if (body.targetType === "product") {
    const product = await prisma.product.findFirst({
      where: { id: body.targetId, proId: auth.proId },
      select: { id: true, name: true },
    });
    if (!product) {
      throw new ApiError(404, "Produit introuvable.");
    }
    await prisma.product.update({
      where: { id: product.id },
      data: { isAvailable: body.isAvailable, unavailableUntil: null },
    });
    itemName = product.name;
  } else {
    // Un choix n'appartient au Pro courant que si son groupe (option) ->
    // son produit -> proId correspond -- jamais fait confiance uniquement
    // au targetId fourni par le client, voir le même principe partout
    // ailleurs dans ce fichier côté API (ex: requireProOrEmployee).
    const choice = await prisma.optionChoice.findFirst({
      where: { id: body.targetId, option: { product: { proId: auth.proId } } },
      select: {
        id: true,
        name: true,
        option: { select: { name: true, product: { select: { name: true } } } },
      },
    });
    if (!choice) {
      throw new ApiError(404, "Choix d'option introuvable.");
    }
    await prisma.optionChoice.update({
      where: { id: choice.id },
      data: { isAvailable: body.isAvailable, unavailableUntil: null },
    });
    itemName = choice.name;
    itemContext = `${choice.option.product.name} — ${choice.option.name}`;
  }

  if (auth.isEmployee) {
    const [employee, pro] = await Promise.all([
      prisma.user.findUnique({ where: { id: auth.userId }, select: { firstName: true, lastName: true } }),
      prisma.pro.findUnique({
        where: { id: auth.proId },
        select: { businessName: true, user: { select: { id: true, email: true } } },
      }),
    ]);

    if (pro) {
      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Un employé";
      const label = itemContext ? `${itemName} (${itemContext})` : itemName;

      if (!body.isAvailable) {
        // sendEmail (voir lib/emails/shared.ts) est déjà best-effort par
        // design -- ne lève jamais, pas besoin de try/catch ici.
        await sendStockOutAlertToProEmail(pro.user.email, {
          proBusinessName: pro.businessName,
          itemLabel: label,
          employeeName,
        });

        await prisma.notification
          .create({
            data: {
              userId: pro.user.id,
              type: NotificationType.SYSTEM,
              title: "⚠️ Rupture signalée",
              body: `${employeeName} a signalé "${label}" en rupture.`,
              data: { kind: "stock_out", targetType: body.targetType, targetId: body.targetId },
            },
          })
          .catch((err) => console.error("[stock] Échec création notification rupture:", err));
      } else {
        // sendPushToPro (voir lib/webPush.ts) est également best-effort --
        // aucun abonnement actif = simple no-op, jamais d'erreur remontée.
        await sendPushToPro(auth.proId, {
          title: "✅ De nouveau disponible",
          body: `${employeeName} a remis "${label}" en stock.`,
          url: "/",
        });

        await prisma.notification
          .create({
            data: {
              userId: pro.user.id,
              type: NotificationType.SYSTEM,
              title: "✅ Produit de nouveau disponible",
              body: `${employeeName} a remis "${label}" en stock.`,
              data: { kind: "stock_available", targetType: body.targetType, targetId: body.targetId },
            },
          })
          .catch((err) => console.error("[stock] Échec création notification retour:", err));
      }
    }
  }

  return NextResponse.json({ ok: true });
});

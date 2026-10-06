-- QR de remise Pro -> Livreur (06/10/2026) : voir prisma/schema.prisma model
-- Order (pickupCode / pickupVerifiedAt), apps/api/src/lib/pickupCode.ts et
-- apps/api/src/app/api/order-pickup/route.ts.
-- À exécuter dans Supabase (SQL Editor) AVANT de déployer l'API : sans ces
-- colonnes, Prisma plante sur toute lecture de la table "Order".
-- Les commandes existantes gardent pickup_code = NULL : pour elles, l'ancien
-- bouton manuel "J'ai récupéré la commande" reste autorisé (aucune commande
-- en cours n'est bloquée par le déploiement).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickup_code" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "pickup_verified_at" TIMESTAMP(3);

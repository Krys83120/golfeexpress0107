-- Migration : avis independants par cible (pro / livreur / plateforme / produit)
--
-- A UTILISER AVEC : npx prisma migrate dev --create-only --name split_review_targets
-- Remplace le contenu du fichier SQL genere automatiquement par CELUI-CI, puis lance
-- `npx prisma migrate dev` pour l'appliquer. Voir instructions completes dans le chat.
--
-- Pourquoi remplacer le fichier auto-genere : Prisma ne detecte pas les renommages de
-- colonnes tout seul (il ne voit que l'ancien nom "rating"/"comment" disparaitre et un
-- nouveau nom "pro_rating"/"pro_comment" apparaitre) -- il proposerait donc de SUPPRIMER
-- les colonnes existantes puis d'en recreer des vides, ce qui effacerait tous les avis
-- deja laisses par vos clients (dont celui de Karim Saidi vu a l'ecran). Le script
-- ci-dessous RENOMME les colonnes a la place : aucune donnee existante n'est perdue.

-- 1) La note/le commentaire "commercant" existait deja (rating/comment) -- on les
--    renomme simplement vers leurs nouveaux noms, sans perte de donnees.
ALTER TABLE "Review" RENAME COLUMN "rating" TO "pro_rating";
ALTER TABLE "Review" RENAME COLUMN "comment" TO "pro_comment";

-- 2) Nouveaux commentaires independants pour le livreur et la plateforme (les notes
--    rider_rating/platform_rating existaient deja, seuls les commentaires sont nouveaux).
ALTER TABLE "Review" ADD COLUMN "rider_comment" TEXT;
ALTER TABLE "Review" ADD COLUMN "platform_comment" TEXT;

-- 3) L'ancienne note produit (un seul chiffre par COMMANDE, jamais rattache a un
--    produit precis) est remplacee par la vraie table ProductReview ci-dessous --
--    elle n'etait de toute facon jamais exploitable, on peut la supprimer sans regret.
ALTER TABLE "Review" DROP COLUMN "product_rating";

-- 4) Nouvelle table : un avis par produit reellement achete, independant du reste.
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductReview_order_id_product_id_key" ON "ProductReview"("order_id", "product_id");

ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5) Note moyenne affichee sur la fiche produit (recalculee a chaque nouvel avis, voir
--    POST /api/orders/[orderId]/review).
ALTER TABLE "Product" ADD COLUMN "rating" DECIMAL(2,1);
ALTER TABLE "Product" ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;
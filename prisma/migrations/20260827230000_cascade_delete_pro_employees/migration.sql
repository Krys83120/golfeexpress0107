-- Suppression d'un compte employé commerçant (PRO_EMPLOYEE) ou du Pro
-- auquel il est rattaché renvoyait une 500 : les FK de ProEmployee vers
-- Pro/User étaient en ON DELETE RESTRICT (comportement par défaut), donc
-- toute tentative de suppression de l'un ou l'autre était bloquée par
-- Postgres. La ligne ProEmployee n'est qu'un lien (pas de contenu
-- métier/financier à préserver comme pour Order), donc CASCADE est sûr :
-- supprimer l'employé ou le Pro supprime juste ce lien, rien d'autre.

-- DropForeignKey
ALTER TABLE "ProEmployee" DROP CONSTRAINT "ProEmployee_pro_id_fkey";

-- DropForeignKey
ALTER TABLE "ProEmployee" DROP CONSTRAINT "ProEmployee_user_id_fkey";

-- AddForeignKey
ALTER TABLE "ProEmployee" ADD CONSTRAINT "ProEmployee_pro_id_fkey" FOREIGN KEY ("pro_id") REFERENCES "Pro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProEmployee" ADD CONSTRAINT "ProEmployee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Statut de vérification KYC/immatriculation du livreur, distinct de
-- Rider.status (cycle de vie du compte) -- voir prisma/schema.prisma,
-- enum RiderVerificationStatus, pour le détail des 3 valeurs :
--   UNVERIFIED             -> 🔴 Non vérifié (défaut)
--   PENDING_REGISTRATION   -> 🟠 En attente d'immatriculation
--   VERIFIED               -> 🟢 Vérifié
--
-- CREATE TYPE dans un bloc DO pour rester idempotent (pas de IF NOT EXISTS
-- supporté par CREATE TYPE avant PG12+, et même là pas pour les enums).
DO $$ BEGIN
  CREATE TYPE "RiderVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_REGISTRATION', 'VERIFIED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Rider"
  ADD COLUMN IF NOT EXISTS "verification_status" "RiderVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- Les livreurs déjà ACTIFS aujourd'hui ont déjà été validés manuellement
-- (SIRET/identité/documents vérifiés par un Admin avant cette fonctionnalité)
-- -- on les marque VERIFIED rétroactivement pour ne pas les bloquer en ligne
-- du jour au lendemain. Les autres restent UNVERIFIED par défaut (valeur de
-- la colonne ci-dessus), qu'ils soient PENDING, SUSPENDED ou BANNED.
UPDATE "Rider" SET "verification_status" = 'VERIFIED' WHERE "status" = 'ACTIVE';

-- Allergènes à déclaration obligatoire par produit (ajout du 27/09/2026,
-- suite à l'audit du même jour) -- voir prisma/schema.prisma, enum
-- Allergen (liste fixe des 14 allergènes réglementaires UE, annexe II du
-- règlement INCO 1169/2011) et Product.allergens.
--
-- CREATE TYPE dans un bloc DO pour rester idempotent (pas de IF NOT EXISTS
-- supporté par CREATE TYPE pour les enums).
DO $$ BEGIN
  CREATE TYPE "Allergen" AS ENUM (
    'GLUTEN', 'CRUSTACES', 'OEUFS', 'POISSON', 'ARACHIDES', 'SOJA', 'LAIT',
    'FRUITS_A_COQUE', 'CELERI', 'MOUTARDE', 'SESAME', 'SULFITES', 'LUPIN', 'MOLLUSQUES'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "allergens" "Allergen"[] NOT NULL DEFAULT '{}';

-- CreateEnum
CREATE TYPE "RiderProfessionalStatus" AS ENUM ('AUTO_ENTREPRENEUR', 'SALARIE', 'INDEPENDANT', 'AUTRE');

-- AlterTable
ALTER TABLE "Pro" ADD COLUMN     "legal_form" TEXT,
ADD COLUMN     "legal_name" TEXT,
ADD COLUMN     "manager_first_name" TEXT,
ADD COLUMN     "manager_last_name" TEXT,
ADD COLUMN     "siret_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "siret_verified_at" TIMESTAMP(3),
ADD COLUMN     "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN     "terms_accepted_ip" TEXT,
ADD COLUMN     "terms_version" TEXT,
ADD COLUMN     "vat_number" TEXT;

-- AlterTable
ALTER TABLE "Rider" ADD COLUMN     "birth_date" TIMESTAMP(3),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "insurance_policy_number" TEXT,
ADD COLUMN     "insurance_provider" TEXT,
ADD COLUMN     "professional_status" "RiderProfessionalStatus",
ADD COLUMN     "profile_photo_url" TEXT,
ADD COLUMN     "siret" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN     "terms_accepted_ip" TEXT,
ADD COLUMN     "terms_version" TEXT,
ADD COLUMN     "verification_selfie_url" TEXT,
ADD COLUMN     "zip_code" TEXT;

/*
  Warnings:

  - A unique constraint covering the columns `[stripe_account_id]` on the table `Pro` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_account_id]` on the table `Rider` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Earning" ADD COLUMN     "stripe_transfer_id" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pro_transfer_id" TEXT,
ADD COLUMN     "rider_transfer_id" TEXT;

-- AlterTable
ALTER TABLE "Pro" ADD COLUMN     "stripe_account_id" TEXT,
ADD COLUMN     "stripe_charges_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_payouts_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Rider" ADD COLUMN     "stripe_account_id" TEXT,
ADD COLUMN     "stripe_charges_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_payouts_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Pro_stripe_account_id_key" ON "Pro"("stripe_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Rider_stripe_account_id_key" ON "Rider"("stripe_account_id");

/*
  Warnings:

  - A unique constraint covering the columns `[stripe_customer_id]` on the table `Pro` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripe_subscription_id]` on the table `Pro` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Pro" ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "subscription_status" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pro_stripe_customer_id_key" ON "Pro"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "Pro_stripe_subscription_id_key" ON "Pro"("stripe_subscription_id");

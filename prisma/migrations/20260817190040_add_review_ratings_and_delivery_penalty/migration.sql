/*
  Warnings:

  - A unique constraint covering the columns `[order_id]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "EarningType" ADD VALUE 'PENALTY';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "late_penalty_applied" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "platform_rating" INTEGER,
ADD COLUMN     "product_rating" INTEGER,
ADD COLUMN     "rider_rating" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Review_order_id_key" ON "Review"("order_id");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "Rider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

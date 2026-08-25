/*
  Warnings:

  - You are about to drop the column `card_brand` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `card_last_4` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "card_brand",
DROP COLUMN "card_last_4";

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "special_instructions" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "allow_special_instructions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_extra_fee_notice" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProductOption" ADD COLUMN     "max_choices" INTEGER;

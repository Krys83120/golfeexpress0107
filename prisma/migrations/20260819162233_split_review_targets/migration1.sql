/*
  Warnings:

  - You are about to drop the column `comment` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `product_rating` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Review` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "rating" DECIMAL(2,1),
ADD COLUMN     "rating_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "comment",
DROP COLUMN "product_rating",
DROP COLUMN "rating",
ADD COLUMN     "platform_comment" TEXT,
ADD COLUMN     "pro_comment" TEXT,
ADD COLUMN     "pro_rating" INTEGER,
ADD COLUMN     "rider_comment" TEXT;

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_order_id_product_id_key" ON "ProductReview"("order_id", "product_id");

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

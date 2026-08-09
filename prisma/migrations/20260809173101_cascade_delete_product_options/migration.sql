-- DropForeignKey
ALTER TABLE "ProductOption" DROP CONSTRAINT "ProductOption_product_id_fkey";

-- AddForeignKey
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

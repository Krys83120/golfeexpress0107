-- DropForeignKey
ALTER TABLE "OptionChoice" DROP CONSTRAINT "OptionChoice_option_id_fkey";

-- AddForeignKey
ALTER TABLE "OptionChoice" ADD CONSTRAINT "OptionChoice_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

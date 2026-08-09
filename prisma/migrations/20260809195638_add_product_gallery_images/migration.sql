-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "additional_images" TEXT[] DEFAULT ARRAY[]::TEXT[];

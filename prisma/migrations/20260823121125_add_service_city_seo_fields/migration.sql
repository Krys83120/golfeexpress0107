/*
  Warnings:

  - A unique constraint covering the columns `[seo_slug]` on the table `service_cities` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "service_cities" ADD COLUMN     "lat" DECIMAL(9,6),
ADD COLUMN     "lng" DECIMAL(9,6),
ADD COLUMN     "seo_indexable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seo_intro" TEXT,
ADD COLUMN     "seo_slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "service_cities_seo_slug_key" ON "service_cities"("seo_slug");

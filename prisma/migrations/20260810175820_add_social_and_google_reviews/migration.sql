-- AlterTable
ALTER TABLE "Pro" ADD COLUMN     "facebook_url" TEXT,
ADD COLUMN     "google_place_id" TEXT,
ADD COLUMN     "google_rating" DECIMAL(2,1),
ADD COLUMN     "google_rating_count" INTEGER,
ADD COLUMN     "google_rating_synced_at" TIMESTAMP(3),
ADD COLUMN     "instagram_url" TEXT,
ADD COLUMN     "tiktok_url" TEXT,
ADD COLUMN     "website_url" TEXT;

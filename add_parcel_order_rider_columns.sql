-- Finition Colis Express, workflow Livreur (23/09/2026) : voir
-- prisma/schema.prisma model ParcelOrder, parcel-orders/status/route.ts et
-- riders/me/available-parcel-orders/route.ts.
ALTER TABLE "ParcelOrder" ADD COLUMN IF NOT EXISTS "rider_transfer_id" TEXT;
ALTER TABLE "ParcelOrder" ADD COLUMN IF NOT EXISTS "rider_notified_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_status_placed_at_idx" ON "Order"("status", "placed_at");

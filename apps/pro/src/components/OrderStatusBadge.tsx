import React from "react";
import { OrderStatus } from "@golfeexpress/types";
import { ORDER_STATUS_LABELS } from "@/services/orderStatusLabels";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_LABELS[status];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}

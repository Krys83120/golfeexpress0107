import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { RevenuePoint } from "@/services/dashboardAggregations";

interface RevenueChartProps {
  data: RevenuePoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-nuit">📈 Chiffre d'affaires</h3>
        <span className="text-sm text-gris">Cette semaine</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2ECC71" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} width={50} />
          <Tooltip
            formatter={(value: number) => [`${value} €`, "CA"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #F3F4F6" }}
          />
          <Area type="monotone" dataKey="value" stroke="#2ECC71" strokeWidth={2.5} fill="url(#revenueGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

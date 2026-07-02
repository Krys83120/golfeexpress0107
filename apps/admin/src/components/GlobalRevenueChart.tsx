import React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { AdminStats } from "@/services/adminDashboardApi";

type GlobalRevenuePoint = AdminStats["revenueByDay"][number];

interface GlobalRevenueChartProps {
  data: GlobalRevenuePoint[];
}

export function GlobalRevenueChart({ data }: GlobalRevenueChartProps) {
  return (
    <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-heading text-base font-bold text-nuit">📈 Flux financiers de la plateforme</h3>
        <span className="text-sm text-gris">Cette semaine</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="platformGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#2ECC71" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="prosGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2196F3" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2196F3" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ridersGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} width={55} />
          <Tooltip
            formatter={(value: number) => [`${value} €`]}
            contentStyle={{ borderRadius: 12, border: "1px solid #F3F4F6" }}
          />
          <Legend
            formatter={(value) =>
              value === "platform" ? "Plateforme" : value === "pros" ? "Commerçants" : "Livreurs"
            }
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
          <Area type="monotone" dataKey="pros" stroke="#2196F3" strokeWidth={2} fill="url(#prosGradient)" />
          <Area type="monotone" dataKey="riders" stroke="#FF6B35" strokeWidth={2} fill="url(#ridersGradient)" />
          <Area type="monotone" dataKey="platform" stroke="#2ECC71" strokeWidth={2.5} fill="url(#platformGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

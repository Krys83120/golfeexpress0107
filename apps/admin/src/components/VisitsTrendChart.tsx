import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { VisitTrendPoint } from "@/services/visitsApi";
import { APP_SOURCE_LABELS, APP_SOURCE_ORDER } from "@/services/appSourceLabels";

interface VisitsTrendChartProps {
  data: VisitTrendPoint[];
}

/** Tendance de visites (une ligne par app), voir GlobalRevenueChart.tsx pour le composant équivalent côté revenus -- même style, adapté en LineChart (4 séries plutôt que 3 zones empilées, ça se lit mieux en lignes distinctes ici). */
export function VisitsTrendChart({ data }: VisitsTrendChartProps) {
  return (
    <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #F3F4F6" }} />
          <Legend
            formatter={(value) => APP_SOURCE_LABELS[value as keyof typeof APP_SOURCE_LABELS]?.label ?? value}
            iconType="circle"
            wrapperStyle={{ fontSize: 12 }}
          />
          {APP_SOURCE_ORDER.map((app) => (
            <Line
              key={app}
              type="monotone"
              dataKey={app}
              name={app}
              stroke={APP_SOURCE_LABELS[app].color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

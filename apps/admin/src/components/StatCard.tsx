import React from "react";

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
}

export function StatCard({ icon, label, value, trend, accentColor = "#2ECC71" }: StatCardProps) {
  return (
    <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="mb-3 flex items-center justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
          style={{ backgroundColor: `${accentColor}1A` }}
        >
          {icon}
        </div>
        {trend && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: trend.positive ? "#E8F5E9" : "#FFEBEE",
              color: trend.positive ? "#2ECC71" : "#F44336",
            }}
          >
            {trend.positive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <p className="font-heading text-2xl font-extrabold text-nuit">{value}</p>
      <p className="mt-1 text-sm text-gris">{label}</p>
    </div>
  );
}

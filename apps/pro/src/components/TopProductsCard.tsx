import React from "react";
import type { TopProductAgg } from "@/services/dashboardAggregations";

interface TopProductsCardProps {
  products: TopProductAgg[];
}

export function TopProductsCard({ products }: TopProductsCardProps) {
  return (
    <div className="rounded bg-white p-5 shadow-sm" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <h3 className="mb-4 font-heading text-base font-bold text-nuit">🏆 Top produits</h3>
      {products.length === 0 ? (
        <p className="py-4 text-center text-sm text-gris">Pas encore de ventes.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product, index) => (
            <div key={product.name} className="flex items-center gap-3">
              <span className="w-5 text-sm font-bold text-gris">{index + 1}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gris-light text-lg">
                {product.emoji}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-nuit">{product.name}</p>
                <p className="text-xs text-gris">{product.salesCount} ventes</p>
              </div>
              <p className="text-sm font-bold text-golfe-green">{product.revenue.toFixed(2)} €</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

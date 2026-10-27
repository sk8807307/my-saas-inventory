import KpiCard from "@/components/dashboard/kpi-card";
import { Layers, Package, ShieldAlert } from "lucide-react";

type InventorySummaryCardsProps = {
  // null means the product request is still loading.
  productCount: number | null;
  availableUnits: number | null;
};

export function InventorySummaryCards({
  productCount,
  availableUnits,
}: InventorySummaryCardsProps) {
  const cards = [
    {
      label: "Products",
      value: productCount === null ? "…" : String(productCount),
      change: "0%",
      trend: "up" as const,
      description: "across your workspaces",
      icon: Package,
    },
    {
      label: "Available units",
      value: availableUnits === null ? "…" : String(availableUnits),
      change: "0%",
      trend: "up" as const,
      description: "in stock",
      icon: Layers,
    },
    {
      label: "Low-stock items",
      value: "0",
      change: "0",
      trend: "down" as const,
      description: "require attention",
      icon: ShieldAlert,
    },
  ];

  return (
    <section
      aria-label="Inventory summary"
      className="grid gap-6 sm:grid-cols-3"
    >
      {cards.map((card) => (
        <KpiCard
          key={card.label}
          title={card.label}
          value={card.value}
          change={card.change}
          trend={card.trend}
          description={card.description}
          icon={card.icon}
        />
      ))}
    </section>
  );
}

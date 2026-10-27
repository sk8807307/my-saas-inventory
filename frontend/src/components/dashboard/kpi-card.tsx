
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type KpiCardProps = {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  description: string;
  icon: LucideIcon;
};

export default function KpiCard({
  title,
  value,
  change,
  trend,
  description,
  icon: Icon,
}: KpiCardProps) {
  const positive = trend === "up";

  return (
    <section className="surface rounded-xl border subtle-border p-5 shadow-sm shadow-black/2">
      <div className="flex items-start justify-between gap-3">
        <p className="muted-text text-sm font-medium">{title}</p>
        <div className="rounded-lg bg-(--primary-soft) p-2.5 text-(--primary)">
          <Icon size={19} />
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight sm:text-[28px]">
        {value}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold"
          style={{
            color: positive ? "var(--success)" : "var(--danger)",
            background: positive
              ? "var(--success-soft)"
              : "var(--warning-soft)",
          }}
        >
          {positive ? (
            <ArrowUpRight size={14} />
          ) : (
            <ArrowDownRight size={14} />
          )}
          {change}
        </span>

        <span className="muted-text">{description}</span>
      </div>
    </section>
  );
}

"use client";

import type { DashboardChartPoint } from "@/features/dashboard/types";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

type SalesOverviewProps = {
  data: DashboardChartPoint[];
};

export default function SalesOverview({ data }: SalesOverviewProps) {
  const [period, setPeriod] = useState("This year");

  return (
    <section className="surface min-w-0 rounded-xl border subtle-border p-5 shadow-sm shadow-black/2 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Sales overview</h2>
          <p className="muted-text mt-1 text-xs">
            Demo visualization · not connected to live sales
          </p>
        </div>

        <label className="relative">
          <span className="sr-only">Chart period</span>
          <select
            className="field appearance-none pr-8 text-xs"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option>This year</option>
            <option>Last 12 months</option>
          </select>
          <ChevronDown
            size={14}
            className="muted-text pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
          />
        </label>
      </div>

      <div className="mt-7 flex h-57.5 gap-3">
        <div className="muted-text flex flex-col justify-between pb-6 text-[10px]">
          <span>100</span><span>75</span><span>50</span><span>25</span><span>0</span>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col justify-between">
          {[0, 1, 2, 3, 4].map((line) => (
            <div
              key={line}
              className="pointer-events-none absolute left-0 right-0 border-t border-dashed subtle-border"
              style={{ top: `${line * 25}%` }}
            />
          ))}

          <div className="relative z-10 flex h-full items-end justify-between gap-1 sm:gap-2">
            {data.map((item) => (
              <div
                key={item.month}
                className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                title={`${item.month}: illustrative index ${item.value}`}
              >
                <div
                  className="w-full rounded-t-md transition-opacity group-hover:opacity-75"
                  style={{
                    height: `${item.value}%`,
                    background:
                      item.month === "Oct"
                        ? "var(--primary)"
                        : "color-mix(in srgb, var(--primary) 42%, var(--surface))",
                    minHeight: 4,
                  }}
                />
              </div>
            ))}
          </div>

          <div className="muted-text mt-2 flex justify-between text-[10px]">
            {data.map((item) => (
              <span key={item.month} className="text-center">{item.month}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { ArrowDownToLine, Plus } from "lucide-react";

import KpiCard from "@/components/dashboard/kpi-card";
import RecentActivity from "@/components/dashboard/recent-activity";
import SalesOverview from "@/components/dashboard/sales-overview";
import PageContainer from "@/components/layout/page-container";
import { getDashboardSnapshot } from "@/features/dashboard/service";

export default function DashboardPage() {
  const dashboard = getDashboardSnapshot();

  return (
    <PageContainer
      title="Dashboard"
      description="Here's an overview of your business workspace."
      actions={
        <>
          <button
            type="button"
            className="icon-button"
            title="Export dashboard (demo)"
            aria-label="Export dashboard (demo)"
          >
            <ArrowDownToLine size={17} />
          </button>

          <button type="button" className="primary-button">
            <Plus size={16} />
            Quick action
          </button>
        </>
      }
    >
      <div className="mb-6 rounded-xl border subtle-border bg-(--primary-soft) px-4 py-3">
        <p className="text-xs leading-5 text-(--primary)">
          <strong>Preview mode:</strong> all dashboard figures, chart values,
          and activity entries are placeholders. No business data is connected.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => (
          <KpiCard key={metric.id} {...metric} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <SalesOverview data={dashboard.salesByMonth} />
        <RecentActivity activities={dashboard.recentActivities} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="surface rounded-xl border subtle-border p-5 sm:p-6">
          <h2 className="text-base font-semibold">Inventory summary</h2>
          <p className="muted-text mt-1 text-xs">
            Reserved area for future stock indicators
          </p>
          <div className="mt-5 flex min-h-24 items-center justify-center rounded-lg border border-dashed subtle-border px-4 py-6 text-center">
            <p className="muted-text max-w-xs text-sm">
              Stock levels, low-stock alerts, and inventory valuation will be
              introduced in a later phase.
            </p>
          </div>
        </section>

        <section className="surface rounded-xl border subtle-border p-5 sm:p-6">
          <h2 className="text-base font-semibold">Sales summary</h2>
          <p className="muted-text mt-1 text-xs">
            Reserved area for future sales indicators
          </p>
          <div className="mt-5 flex min-h-24 items-center justify-center rounded-lg border border-dashed subtle-border px-4 py-6 text-center">
            <p className="muted-text max-w-xs text-sm">
              Order status, sales performance, and customer insights will be
              introduced in a later phase.
            </p>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}







import { Badge } from "@/components/ui/badge";
import type {
  DashboardActivity,
  DashboardActivityType,
} from "@/features/dashboard/types";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  ShoppingCart,
} from "lucide-react";

const activityIcons = {
  sales: ShoppingCart,
  inventory: ArrowDownToLine,
  purchase: ArrowUpFromLine,
  report: FileText,
} satisfies Record<DashboardActivityType, typeof ShoppingCart>;

type RecentActivityProps = {
  activities: DashboardActivity[];
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <section className="surface rounded-xl border subtle-border p-5 shadow-sm shadow-black/2 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Recent activity</h2>
          <p className="muted-text mt-1 text-xs">
            Illustrative events for the dashboard layout
          </p>
        </div>

        <Badge variant="outline">Demo</Badge>
      </div>

      <div className="mt-5">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type];

          return (
            <div
              key={activity.id}
              className={`flex items-start gap-3 py-4 ${
                index !== activities.length - 1 ? "border-b subtle-border" : ""
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--primary-soft) text-(--primary)">
                <Icon size={17} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="muted-text mt-1 text-xs">{activity.detail}</p>
              </div>

              <span className="muted-text shrink-0 text-[11px]">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import type { LucideIcon } from "lucide-react";

export type DashboardMetric = {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  description: string;
  icon: LucideIcon;
};

export type DashboardActivityType = "sales" | "inventory" | "purchase" | "report";

export type DashboardActivity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  type: DashboardActivityType;
};

export type DashboardChartPoint = {
  month: string;
  value: number;
};

export type DashboardSnapshot = {
  metrics: DashboardMetric[];
  salesByMonth: DashboardChartPoint[];
  recentActivities: DashboardActivity[];
};

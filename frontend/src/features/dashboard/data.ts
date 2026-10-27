import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ShoppingCart,
} from "lucide-react";
import type { DashboardSnapshot } from "./types";

// Preview values only. Replace this source when a real data provider is added.
export const dashboardPreviewData: DashboardSnapshot = {
  metrics: [
    {
      id: "revenue",
      title: "Total revenue",
      value: "₹ —",
      change: "Demo",
      trend: "up",
      description: "Illustrative metric",
      icon: ShoppingCart,
    },
    {
      id: "orders",
      title: "Total orders",
      value: "—",
      change: "Demo",
      trend: "up",
      description: "Illustrative metric",
      icon: Boxes,
    },
    {
      id: "inventory",
      title: "Inventory items",
      value: "—",
      change: "Demo",
      trend: "up",
      description: "Illustrative metric",
      icon: ArrowDownToLine,
    },
    {
      id: "purchases",
      title: "Pending purchases",
      value: "—",
      change: "Demo",
      trend: "down",
      description: "Illustrative metric",
      icon: ArrowUpFromLine,
    },
  ],
  salesByMonth: [
    { month: "Jan", value: 36 },
    { month: "Feb", value: 48 },
    { month: "Mar", value: 42 },
    { month: "Apr", value: 62 },
    { month: "May", value: 52 },
    { month: "Jun", value: 72 },
    { month: "Jul", value: 60 },
    { month: "Aug", value: 82 },
    { month: "Sep", value: 65 },
    { month: "Oct", value: 92 },
    { month: "Nov", value: 75 },
    { month: "Dec", value: 100 },
  ],
  recentActivities: [
    {
      id: "sales-sample",
      title: "Sales activity placeholder",
      detail: "Sample order event",
      time: "Today",
      type: "sales",
    },
    {
      id: "inventory-sample",
      title: "Inventory activity placeholder",
      detail: "Sample stock event",
      time: "Today",
      type: "inventory",
    },
    {
      id: "purchase-sample",
      title: "Purchase activity placeholder",
      detail: "Sample purchase event",
      time: "Yesterday",
      type: "purchase",
    },
    {
      id: "report-sample",
      title: "Report activity placeholder",
      detail: "Sample reporting event",
      time: "Yesterday",
      type: "report",
    },
  ],
};

import { dashboardPreviewData } from "./data";
import type { DashboardSnapshot } from "./types";

/** Dashboard boundary for preview data; Django/API integration is deferred. */
export function getDashboardSnapshot(): DashboardSnapshot {
  return dashboardPreviewData;
}

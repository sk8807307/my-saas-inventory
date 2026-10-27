import { compareDateOnly, isDateOnly, type DateOnly } from "@/lib/date-time";
import type {
  PurchaseOrderApprovalStatus,
  PurchaseOrderReceivingStatus,
  SupplierStatus,
} from "./types";

export function canCreatePurchaseOrder(supplierStatus: SupplierStatus): boolean {
  return supplierStatus === "Active";
}

export function canTransitionPurchaseOrderApproval(
  current: PurchaseOrderApprovalStatus,
  next: PurchaseOrderApprovalStatus,
): boolean {
  if (current === "Draft") return next === "Pending Approval";
  if (current === "Pending Approval") return next === "Approved" || next === "Rejected";
  return false;
}

export function canTransitionPurchaseOrderReceiving(
  approvalStatus: PurchaseOrderApprovalStatus,
  current: PurchaseOrderReceivingStatus,
  next: PurchaseOrderReceivingStatus,
): boolean {
  if (approvalStatus !== "Approved") return false;
  if (current === "Unreceived") {
    return next === "Partially Received" || next === "Received";
  }
  return current === "Partially Received" && next === "Received";
}

export function canReceivePurchaseOrder(
  approvalStatus: PurchaseOrderApprovalStatus,
  receivingStatus: PurchaseOrderReceivingStatus,
): boolean {
  return approvalStatus === "Approved" && receivingStatus !== "Received";
}

export type ExpectedDateIndicator =
  | "not-applicable"
  | "not-due"
  | "due-soon"
  | "overdue";

/**
 * Computes a display-only SLA indicator. The due-soon window is supplied by
 * configuration; the indicator never prevents warehouse receiving.
 */
export function getExpectedDateIndicator(input: {
  expectedDate?: DateOnly | null;
  today: DateOnly;
  receivingStatus: PurchaseOrderReceivingStatus;
  dueSoonWindowDays: number;
}): ExpectedDateIndicator {
  const { expectedDate, today, receivingStatus, dueSoonWindowDays } = input;
  if (receivingStatus === "Received" || !expectedDate) return "not-applicable";
  if (!isDateOnly(expectedDate) || !isDateOnly(today)) {
    throw new RangeError("Expected delivery date and today must be valid YYYY-MM-DD dates.");
  }
  if (!Number.isInteger(dueSoonWindowDays) || dueSoonWindowDays < 0) {
    throw new RangeError("dueSoonWindowDays must be a non-negative integer.");
  }

  const difference = compareDateOnly(expectedDate, today);
  if (difference < 0) return "overdue";

  const expected = Date.parse(`${expectedDate}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  const daysUntilExpected = Math.floor((expected - current) / 86_400_000);
  return daysUntilExpected <= dueSoonWindowDays ? "due-soon" : "not-due";
}


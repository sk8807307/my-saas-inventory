import type { CurrencyCode, MoneyAmount } from "@/lib/money";
import type { DateOnly } from "@/lib/date-time";

export const supplierStatuses = [
  "Onboarding",
  "Active",
  "On Hold",
  "Deactivated",
] as const;
export type SupplierStatus = (typeof supplierStatuses)[number];

export const purchaseOrderApprovalStatuses = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Rejected",
] as const;
export type PurchaseOrderApprovalStatus =
  (typeof purchaseOrderApprovalStatuses)[number];

export const purchaseOrderReceivingStatuses = [
  "Unreceived",
  "Partially Received",
  "Received",
] as const;
export type PurchaseOrderReceivingStatus =
  (typeof purchaseOrderReceivingStatuses)[number];

export type SupplierOperationalSummary = {
  name: string;
  primaryContact?: string | null;
  leadTimeDays?: number | null;
  currency: CurrencyCode;
  status: SupplierStatus;
};

/** Only expose these fields after checking suppliers:read-financial. */
export type SupplierFinancialDetails = {
  bankDetails?: string | null;
  taxId?: string | null;
  paymentTerms?: string | null;
};

export type PurchaseOrderSummary = {
  purchaseOrderId: string;
  supplierId: string;
  approvalStatus: PurchaseOrderApprovalStatus;
  receivingStatus: PurchaseOrderReceivingStatus;
  expectedDeliveryDate?: DateOnly | null;
  total?: MoneyAmount | null;
};


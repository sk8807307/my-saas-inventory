export const salesOrderStatuses = [
  "Draft",
  "Confirmed",
  "Processing",
  "Completed",
  "Cancelled",
] as const;

export type SalesOrderStatus = (typeof salesOrderStatuses)[number];

export const paymentStatuses = ["Unpaid", "Partial", "Paid"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const fulfillmentStatuses = ["Unfulfilled", "Partial", "Shipped"] as const;
export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];

export type SalesOrderState = {
  status: SalesOrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
};

/** Operational fields suitable for an order list. */
export type SalesCustomerSummary = {
  name: string;
  company?: string | null;
  contact?: string | null;
  accountStatus?: string | null;
};

/** Sensitive customer fields belong only on an authorized detail view. */
export type SalesCustomerSensitiveDetails = {
  taxId?: string | null;
  creditLimit?: import("@/lib/money").MoneyAmount | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
};

/** Order fields returned by Django, annotated with their membership tenant. */
export interface Sale {
  id: number;
  number: string;
  customer: number;
  customer_name: string;
  status: "draft" | "confirmed" | "processing" | "completed" | "cancelled";
  payment_status: "unpaid" | "partial" | "paid";
  fulfillment_status: "unfulfilled" | "partial" | "shipped";
  currency: string;
  paid_minor: number;
  created_at: string;
  updated_at: string;
  tenant_id: number;
  tenant_name: string;
  tenant_role: string;
}
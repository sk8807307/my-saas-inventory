import type { FulfillmentStatus, SalesOrderStatus } from "./types";

const forwardTransitions: Record<SalesOrderStatus, readonly SalesOrderStatus[]> = {
  Draft: ["Confirmed"],
  Confirmed: ["Processing"],
  Processing: ["Completed"],
  Completed: [],
  Cancelled: [],
};

/** Line items and prices become read-only once the order leaves Draft. */
export function canEditSalesOrderLines(status: SalesOrderStatus): boolean {
  return status === "Draft";
}

/**
 * Cancellation is allowed before shipment. Partially or fully shipped orders
 * must use a separate return/credit workflow instead of cancellation.
 */
export function canCancelSalesOrder(
  status: SalesOrderStatus,
  fulfillmentStatus: FulfillmentStatus,
): boolean {
  return (
    (status === "Draft" || status === "Confirmed" || status === "Processing") &&
    fulfillmentStatus === "Unfulfilled"
  );
}

export function requiresReturnOrCreditWorkflow(
  fulfillmentStatus: FulfillmentStatus,
): boolean {
  return fulfillmentStatus === "Partial" || fulfillmentStatus === "Shipped";
}

/** Checks the agreed forward lifecycle, with cancellation as an unshipped terminal path. */
export function canTransitionSalesOrder(
  current: SalesOrderStatus,
  next: SalesOrderStatus,
  fulfillmentStatus: FulfillmentStatus,
): boolean {
  if (next === "Cancelled") {
    return canCancelSalesOrder(current, fulfillmentStatus);
  }

  if (next === "Completed") {
    return current === "Processing" && fulfillmentStatus === "Shipped";
  }

  return forwardTransitions[current].includes(next);
}


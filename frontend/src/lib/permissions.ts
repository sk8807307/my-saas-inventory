export const permissionClaims = [
  "inventory:adjust",
  "sales:confirm",
  "sales:cancel",
  "purchasing:approve",
  "purchasing:receive",
  "suppliers:read-financial",
] as const;

export type PermissionClaim = (typeof permissionClaims)[number];

/** UI capability helper only; protect every API operation on the server too. */
export function hasPermission(
  claims: readonly string[],
  required: PermissionClaim,
): boolean {
  return claims.includes(required);
}

export function canViewSupplierFinancialDetails(claims: readonly string[]): boolean {
  return hasPermission(claims, "suppliers:read-financial");
}

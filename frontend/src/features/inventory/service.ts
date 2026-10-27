import {
  deleteJson,
  getJson,
  patchJson,
  postJson,
  putJson,
} from "@/lib/http";
import { selectTenant } from "@/features/auth/service";
import type { AuthMembership } from "@/features/auth/types";
import type { Sale } from "@/features/sales/types";
import type {
  Product,
  ProductCreateRequest,
  ProductInventoryItem,
  ProductUpdateRequest,
  StockAdjustmentRequest,
  WarehouseReorderPointRequest,
} from "./types";

const pageSize = 100;

async function getAllPages<T>(path: string): Promise<T[]> {
  const allRows: T[] = [];
  let page = 1;

  while (true) {
    const rows = await getJson<T[]>(`${path}?page=${page}&pageSize=${pageSize}`);
    allRows.push(...rows);
    if (rows.length < pageSize) return allRows;
    page += 1;
  }
}

async function getActiveMemberships(): Promise<AuthMembership[]> {
  const memberships = await getJson<AuthMembership[]>("/api/auth/memberships/");
  return memberships.filter(
    (membership) =>
      membership.status === "active" && membership.tenant.is_active,
  );
}

/** Load product rows for every active tenant the signed-in user can access. */
export async function getProducts(): Promise<Product[]> {
  const memberships = await getActiveMemberships();
  const products: Product[] = [];

  // Django stores one active tenant in the session, so switch and fetch in order.
  for (const membership of memberships) {
    await selectTenant(membership.tenant.id);
    const tenantProducts = await getAllPages<ProductInventoryItem>(
      "/api/inventory/products/",
    );

    products.push(
      ...tenantProducts.map((product) => ({
        ...product,
        tenant_id: membership.tenant.id,
        tenant_name: membership.tenant.name,
        tenant_role: membership.role,
      })),
    );
  }

  // Leave a predictable tenant active for other single-tenant actions.
  if (memberships.length > 0) {
    await selectTenant(memberships[0].tenant.id);
  }

  return products;
}

/** Return sales orders from every active tenant membership. */
export async function getSales(): Promise<Sale[]> {
  const memberships = await getActiveMemberships();
  const orders: Sale[] = [];

  for (const membership of memberships) {
    await selectTenant(membership.tenant.id);
    const tenantOrders = await getAllPages<Omit<Sale, "tenant_id" | "tenant_name" | "tenant_role">>(
      "/api/sales/orders/",
    );
    orders.push(
      ...tenantOrders.map((order) => ({
        ...order,
        tenant_id: membership.tenant.id,
        tenant_name: membership.tenant.name,
        tenant_role: membership.role,
      })),
    );
  }

  if (memberships.length > 0) {
    await selectTenant(memberships[0].tenant.id);
  }

  return orders;
}

export function getProductById(id: number): Promise<ProductInventoryItem> {
  return getJson<ProductInventoryItem>(`/api/inventory/products/${id}/`);
}

export function createProduct(data: ProductCreateRequest): Promise<ProductInventoryItem> {
  return postJson<ProductInventoryItem>("/api/inventory/products/", data);
}

export function updateProduct(
  id: number,
  data: ProductUpdateRequest,
): Promise<ProductInventoryItem> {
  return putJson<ProductInventoryItem>(`/api/inventory/products/${id}/`, data);
}

export function partialUpdateProduct(
  id: number,
  data: Partial<ProductUpdateRequest>,
): Promise<ProductInventoryItem> {
  return patchJson<ProductInventoryItem>(`/api/inventory/products/${id}/`, data);
}

export function deleteProduct(id: number): Promise<void> {
  return deleteJson(`/api/inventory/products/${id}/`);
}

export function adjustStock(data: StockAdjustmentRequest): Promise<{ detail: string }> {
  return postJson<{ detail: string }>("/api/inventory/stock/adjustments/", data);
}

export function setWarehouseReorderPoint(
  data: WarehouseReorderPointRequest,
): Promise<{ id: number; quantity: string }> {
  return postJson<{ id: number; quantity: string }>(
    "/api/inventory/warehouse-reorder-points/",
    data,
  );
}
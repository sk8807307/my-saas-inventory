"use client";

import type { Product } from "@/features/inventory/types";

type InventoryTableProps = {
  products: Product[];
  loading: boolean;
  error: string | null;
};

export function InventoryTable({ products, loading, error }: InventoryTableProps) {
  return (
    <div className="surface overflow-x-auto rounded-xl border subtle-border shadow-sm">
      <table className="w-full min-w-200 text-left text-sm">
        <caption className="sr-only">Inventory products across your workspaces</caption>
        <thead className="muted-text border-b subtle-border bg-black/2 text-xs uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Workspace</th>
            <th scope="col" className="px-4 py-3">SKU</th>
            <th scope="col" className="px-4 py-3">Product Name</th>
            <th scope="col" className="px-4 py-3">Locations / Bins</th>
            <th scope="col" className="px-4 py-3 text-right">On Hand</th>
            <th scope="col" className="px-4 py-3 text-right">Reserved</th>
            <th scope="col" className="px-4 py-3 text-right">Available</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr><td colSpan={7} className="muted-text animate-pulse px-4 py-12 text-center tracking-wide">Loading inventory across your workspaces…</td></tr>
          )}
          {!loading && error && (
            <tr><td colSpan={7} className="px-4 py-12 text-center font-medium text-red-500">{error}</td></tr>
          )}
          {!loading && !error && products.length === 0 && (
            <tr><td colSpan={7} className="muted-text px-4 py-12 text-center">No inventory products found in your workspaces.</td></tr>
          )}
          {!loading && !error && products.map((item) => (
            <tr key={`${item.tenant_id}:${item.id}`} className="border-b subtle-border transition-colors hover:bg-black/1">
              <td className="px-4 py-3">
                <div className="font-medium">{item.tenant_name}</div>
                <div className="muted-text text-xs capitalize">{item.tenant_role}</div>
              </td>
              <td className="px-4 py-3 font-mono font-medium text-(--primary)">{item.sku}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{item.name}</div>
                {item.base_uom_code && <div className="muted-text mt-0.5 text-xs font-medium uppercase tracking-wider">Unit: {item.base_uom_code}</div>}
              </td>
              <td className="max-w-50 truncate px-4 py-3 text-xs font-medium" title={item.warehouse_bin}>{item.warehouse_bin}</td>
              <td className="px-4 py-3 text-right font-semibold">{Number(item.on_hand).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</td>
              <td className="px-4 py-3 text-right font-medium text-red-500">{Number(item.reserved) > 0 ? Number(item.reserved).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : "0.00"}</td>
              <td className="px-4 py-3 text-right font-bold text-green-600">{Number(item.available).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

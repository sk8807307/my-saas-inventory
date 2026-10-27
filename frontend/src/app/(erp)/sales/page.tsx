"use client";

import PageContainer from "@/components/layout/page-container";
import { getSales } from "@/features/inventory/service";
import type { Sale } from "@/features/sales/types";
import { ApiError, getErrorMessage } from "@/lib/http";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getSales()
      .then((orders) => {
        if (active) setSales(orders);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          router.replace("/login");
          return;
        }
        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <PageContainer title="Sales" description="Orders, customers, and sales transactions.">
      <div className="surface overflow-x-auto rounded-xl border subtle-border">
        <table className="w-full min-w-180 text-left text-sm">
          <caption className="sr-only">Sales orders across your workspaces</caption>
          <thead className="muted-text border-b subtle-border bg-black/2 text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Workspace</th>
              <th scope="col" className="px-4 py-3">Order</th>
              <th scope="col" className="px-4 py-3">Customer</th>
              <th scope="col" className="px-4 py-3">Order status</th>
              <th scope="col" className="px-4 py-3">Payment</th>
              <th scope="col" className="px-4 py-3">Fulfillment</th>
              <th scope="col" className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="muted-text px-4 py-12 text-center" role="status">Loading sales orders…</td></tr>}
            {!loading && error && <tr><td colSpan={7} className="px-4 py-12 text-center text-red-500" role="alert">{error}</td></tr>}
            {!loading && !error && sales.length === 0 && <tr><td colSpan={7} className="muted-text px-4 py-12 text-center">No sales orders found.</td></tr>}
            {!loading && !error && sales.map((sale) => (
              <tr key={`${sale.tenant_id}:${sale.id}`} className="border-b subtle-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{sale.tenant_name}</div>
                  <div className="muted-text text-xs capitalize">{sale.tenant_role}</div>
                </td>
                <td className="px-4 py-3 font-medium">{sale.number}</td>
                <td className="px-4 py-3">{sale.customer_name}</td>
                <td className="px-4 py-3 capitalize">{sale.status}</td>
                <td className="px-4 py-3 capitalize">{sale.payment_status}</td>
                <td className="px-4 py-3 capitalize">{sale.fulfillment_status}</td>
                <td className="px-4 py-3">{new Date(sale.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
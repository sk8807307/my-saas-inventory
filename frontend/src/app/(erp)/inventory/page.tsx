"use client";

import { InventorySummaryCards } from "@/components/inventory/InventorySummaryCards";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { InventoryToolbar } from "@/components/inventory/InventoryToolbar";
import { ProductDialog } from "@/components/inventory/ProductDialog";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import PageContainer from "@/components/layout/page-container";
import { Pagination } from "@/components/Pagination";
import { getProducts } from "@/features/inventory/service";
import type { Product } from "@/features/inventory/types";
import { ApiError, getErrorMessage, isTenantMissing } from "@/lib/http";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Load products once here so the table and KPI use the same list.
    getProducts()
      .then((rows) => {
        if (active) setProducts(rows);
      })
      .catch((requestError: unknown) => {
        if (!active) return;

        if (requestError instanceof ApiError && requestError.status === 401) {
          router.replace("/login");
          return;
        }
        if (isTenantMissing(requestError)) {
          router.replace("/select-tenant");
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
    <PageContainer
      title="Inventory"
      description="Manage your inventory items and stock levels."
    >
      <div className="flex flex-col gap-4">
        <InventorySummaryCards
          productCount={loading ? null : products.length}
          availableUnits={
            loading
              ? null
              : products.reduce(
                  (total, product) => total + Number(product.available),
                  0,
                )
          }
        />
        <InventoryToolbar />
        <InventoryTable products={products} loading={loading} error={error} />
        <Pagination />
        <ProductDialog />
        <StockAdjustmentDialog />
      </div>
    </PageContainer>
  );
}

// 1. Unified Grid Display Object matching the ProductSerializer fields
export interface ProductInventoryItem {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  base_uom: number;
  base_uom_code: string; // Added for Next.js Sublabel (e.g., 'pcs', 'kg')
  reorder_point: string | null; // DRF DecimalField serialises as a string
  is_active: boolean;
  on_hand: string; // Aggregated total stock count
  reserved: string; // Aggregated total allocation count
  available: string; // Calculated on_hand - reserved balance
  warehouse_bin: string; // Comma-separated list of active bins
  created_at: string;
  updated_at: string;
}

// 2. Data interface payload required to create a new Product catalog entity
export interface ProductCreateRequest {
  sku: string;
  name: string;
  description?: string;
  base_uom: number; // Primary key ID of the UnitOfMeasure configuration
  reorder_point?: string | number;
  is_active?: boolean;
}

// 3. Data payload contract mapping to full Product serialization modifications
export interface ProductUpdateRequest {
  sku: string;
  name: string;
  description: string | null;
  base_uom: number;
  reorder_point: string | number | null;
  is_active: boolean;
}

// 4. Matches the exact structural fields expected by StockAdjustmentSerializer
export interface StockAdjustmentRequest {
  product_id: number;
  location_id: number;
  quantity_change: string | number; // Decimal adjustment value
  note?: string;
}

// 5. Matches the fields expected by WarehouseReorderPointSerializer
export interface WarehouseReorderPointRequest {
  product: number; // Product ID
  warehouse: number; // Warehouse ID
  quantity: string | number;
}

// Short shared name for the product shape returned by the inventory API.
export type Product = ProductInventoryItem & {
  tenant_id: number;
  tenant_name: string;
  tenant_role: string;
};

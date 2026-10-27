-- Nexa ERP PostgreSQL reference schema
-- Target: PostgreSQL 13+ (gen_random_uuid() is available in core).
-- This file captures the currently agreed frontend domain decisions. It is a
-- starting schema for Django migrations, not a replacement for Django models.
-- Inventory UoM, warehouse/bin balances, reservation records, and reorder-point
-- tables are intentionally omitted until their remaining business decisions are made.
-- Payment transactions, shipments/returns, PO receipt-line tolerances, and API
-- payload schemas are also omitted because their contracts have not been decided.
--
-- SECURITY / TRANSACTION NOTES:
-- 1. The Django connection must use a non-owner, non-BYPASSRLS database role.
-- 2. At the beginning of each tenant-scoped transaction set the trusted tenant
--    context with set_config('app.current_tenant_id', <tenant UUID>, true).
-- 3. RLS below isolates tenant rows. Django must still authenticate users and
--    enforce each resource:action claim on every request and operation.
-- 4. Amounts use exact PostgreSQL NUMERIC and an ISO 4217 currency code. Serialize
--    NUMERIC values as decimal strings (or deliberate integer minor units) in APIs.
-- 5. Timestamps use TIMESTAMPTZ (stored as instants); expected delivery is DATE.
--    Serialize timestamps to UTC ISO-8601 with a Z suffix; render using tenant timezone.
-- 6. Execute as a schema owner during initial database setup/migration.

BEGIN;

CREATE TYPE sales_order_status AS ENUM (
  'Draft', 'Confirmed', 'Processing', 'Completed', 'Cancelled'
);
CREATE TYPE sales_payment_status AS ENUM ('Unpaid', 'Partial', 'Paid');
CREATE TYPE sales_fulfillment_status AS ENUM ('Unfulfilled', 'Partial', 'Shipped');
CREATE TYPE supplier_status AS ENUM ('Onboarding', 'Active', 'On Hold', 'Deactivated');
CREATE TYPE purchase_order_approval_status AS ENUM (
  'Draft', 'Pending Approval', 'Approved', 'Rejected'
);
CREATE TYPE purchase_order_receiving_status AS ENUM (
  'Unreceived', 'Partially Received', 'Received'
);

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (btrim(name) <> ''),
  locale text NOT NULL DEFAULT 'en-US',
  time_zone text NOT NULL DEFAULT 'UTC',
  default_currency_code text NOT NULL DEFAULT 'USD'
    CHECK (default_currency_code ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id)
);

-- The permission catalog is global; role assignments are tenant-scoped below.
CREATE TABLE permission_claims (
  claim text PRIMARY KEY,
  description text NOT NULL
);

INSERT INTO permission_claims (claim, description) VALUES
  ('inventory:adjust', 'Adjust inventory quantities'),
  ('sales:confirm', 'Confirm sales orders'),
  ('sales:cancel', 'Cancel eligible unshipped sales orders'),
  ('purchasing:approve', 'Approve or reject purchase orders'),
  ('purchasing:receive', 'Record receipt against approved purchase orders'),
  ('suppliers:read-financial', 'Read supplier financial and tax details')
ON CONFLICT (claim) DO NOTHING;

CREATE TABLE tenant_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_subject text NOT NULL CHECK (btrim(user_subject) <> ''),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, user_subject)
);

CREATE TABLE tenant_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (btrim(name) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, name)
);

CREATE TABLE role_permission_claims (
  tenant_id uuid NOT NULL,
  role_id uuid NOT NULL,
  claim text NOT NULL REFERENCES permission_claims(claim) ON DELETE RESTRICT,
  PRIMARY KEY (tenant_id, role_id, claim),
  FOREIGN KEY (role_id, tenant_id)
    REFERENCES tenant_roles(id, tenant_id) ON DELETE CASCADE
);

CREATE TABLE membership_roles (
  tenant_id uuid NOT NULL,
  membership_id uuid NOT NULL,
  role_id uuid NOT NULL,
  PRIMARY KEY (tenant_id, membership_id, role_id),
  FOREIGN KEY (membership_id, tenant_id)
    REFERENCES tenant_memberships(id, tenant_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id, tenant_id)
    REFERENCES tenant_roles(id, tenant_id) ON DELETE CASCADE
);

-- Minimal product identity needed for tenant-scoped SKU uniqueness.
-- Further stock/UoM/location tables wait for the remaining Inventory decisions.
CREATE TABLE inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  sku text NOT NULL CHECK (sku = upper(btrim(sku)) AND sku <> ''),
  sku_normalized text GENERATED ALWAYS AS (upper(btrim(sku))) STORED,
  name text NOT NULL CHECK (btrim(name) <> ''),
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, sku_normalized)
);

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (btrim(name) <> ''),
  company text,
  contact text,
  account_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id)
);

-- Kept separate so Sales list queries need not select sensitive fields.
CREATE TABLE customer_sensitive_details (
  tenant_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  tax_id text,
  credit_limit numeric CHECK (credit_limit IS NULL OR credit_limit >= 0),
  credit_limit_currency_code text
    CHECK (credit_limit_currency_code IS NULL OR credit_limit_currency_code ~ '^[A-Z]{3}$'),
  billing_address text,
  shipping_address text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, customer_id),
  FOREIGN KEY (customer_id, tenant_id)
    REFERENCES customers(id, tenant_id) ON DELETE RESTRICT,
  CHECK ((credit_limit IS NULL) = (credit_limit_currency_code IS NULL))
);

CREATE TABLE sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL,
  order_number text NOT NULL CHECK (btrim(order_number) <> ''),
  status sales_order_status NOT NULL DEFAULT 'Draft',
  payment_status sales_payment_status NOT NULL DEFAULT 'Unpaid',
  fulfillment_status sales_fulfillment_status NOT NULL DEFAULT 'Unfulfilled',
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  order_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, order_number),
  FOREIGN KEY (customer_id, tenant_id)
    REFERENCES customers(id, tenant_id) ON DELETE RESTRICT,
  CHECK (status <> 'Completed' OR fulfillment_status = 'Shipped'),
  CHECK (status <> 'Cancelled' OR fulfillment_status = 'Unfulfilled')
);

CREATE TABLE sales_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  sales_order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name_snapshot text NOT NULL CHECK (btrim(product_name_snapshot) <> ''),
  sku_snapshot text NOT NULL CHECK (btrim(sku_snapshot) <> ''),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (sales_order_id, tenant_id)
    REFERENCES sales_orders(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id, tenant_id)
    REFERENCES inventory_products(id, tenant_id) ON DELETE RESTRICT
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (btrim(name) <> ''),
  primary_contact text,
  lead_time_days integer CHECK (lead_time_days IS NULL OR lead_time_days >= 0),
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  status supplier_status NOT NULL DEFAULT 'Onboarding',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id)
);

-- Separate table for permission-gated detail fields; Django must check the claim.
CREATE TABLE supplier_financial_details (
  tenant_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  bank_details text,
  tax_id text,
  payment_terms text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, supplier_id),
  FOREIGN KEY (supplier_id, tenant_id)
    REFERENCES suppliers(id, tenant_id) ON DELETE RESTRICT
);

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL,
  order_number text NOT NULL CHECK (btrim(order_number) <> ''),
  approval_status purchase_order_approval_status NOT NULL DEFAULT 'Draft',
  receiving_status purchase_order_receiving_status NOT NULL DEFAULT 'Unreceived',
  expected_delivery_date date,
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, order_number),
  FOREIGN KEY (supplier_id, tenant_id)
    REFERENCES suppliers(id, tenant_id) ON DELETE RESTRICT,
  CHECK (approval_status = 'Approved' OR receiving_status = 'Unreceived')
);

CREATE TABLE purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  purchase_order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name_snapshot text NOT NULL CHECK (btrim(product_name_snapshot) <> ''),
  sku_snapshot text NOT NULL CHECK (btrim(sku_snapshot) <> ''),
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_cost numeric NOT NULL CHECK (unit_cost >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  FOREIGN KEY (purchase_order_id, tenant_id)
    REFERENCES purchase_orders(id, tenant_id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id, tenant_id)
    REFERENCES inventory_products(id, tenant_id) ON DELETE RESTRICT
);

-- Keep order state transitions aligned with the approved lifecycle.
CREATE FUNCTION enforce_sales_order_lifecycle() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'Draft' THEN
      RAISE EXCEPTION 'New sales orders must start in Draft';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'Draft' AND NEW.status IN ('Confirmed', 'Cancelled') THEN
    NULL;
  ELSIF OLD.status = 'Confirmed' AND NEW.status = 'Processing' THEN
    NULL;
  ELSIF OLD.status = 'Confirmed' AND NEW.status = 'Cancelled'
        AND NEW.fulfillment_status = 'Unfulfilled' THEN
    NULL;
  ELSIF OLD.status = 'Processing' AND NEW.status = 'Completed'
        AND NEW.fulfillment_status = 'Shipped' THEN
    NULL;
  ELSIF OLD.status = 'Processing' AND NEW.status = 'Cancelled'
        AND NEW.fulfillment_status = 'Unfulfilled' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'Invalid sales order status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_order_lifecycle_guard
BEFORE INSERT OR UPDATE OF status ON sales_orders
FOR EACH ROW EXECUTE FUNCTION enforce_sales_order_lifecycle();

-- Prevent line edits after confirmation. Lock the parent so confirmation and
-- concurrent line changes serialize within PostgreSQL transactions.
CREATE FUNCTION require_draft_sales_order_for_line_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_order_id uuid;
  parent_tenant_id uuid;
  parent_status sales_order_status;
BEGIN
  IF TG_OP = 'UPDATE' AND
     (NEW.sales_order_id <> OLD.sales_order_id OR NEW.tenant_id <> OLD.tenant_id) THEN
    RAISE EXCEPTION 'A sales order line cannot be moved to another order';
  END IF;

  IF TG_OP = 'DELETE' THEN
    parent_order_id := OLD.sales_order_id;
    parent_tenant_id := OLD.tenant_id;
  ELSE
    parent_order_id := NEW.sales_order_id;
    parent_tenant_id := NEW.tenant_id;
  END IF;

  SELECT status INTO parent_status
  FROM sales_orders
  WHERE id = parent_order_id AND tenant_id = parent_tenant_id
  FOR UPDATE;

  IF NOT FOUND OR parent_status <> 'Draft' THEN
    RAISE EXCEPTION 'Sales order lines can only be changed while the order is Draft';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_order_lines_draft_guard
BEFORE INSERT OR UPDATE OR DELETE ON sales_order_lines
FOR EACH ROW EXECUTE FUNCTION require_draft_sales_order_for_line_change();

-- Only Active suppliers may be used when a new PO is created. Existing POs are
-- not invalidated if a supplier is later put on hold or deactivated.
CREATE FUNCTION require_active_supplier_for_new_po() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  current_supplier_status supplier_status;
BEGIN
  SELECT status INTO current_supplier_status
  FROM suppliers
  WHERE id = NEW.supplier_id AND tenant_id = NEW.tenant_id
  FOR UPDATE;

  IF NOT FOUND OR current_supplier_status <> 'Active' THEN
    RAISE EXCEPTION 'New purchase orders require an Active supplier';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchase_order_active_supplier_guard
BEFORE INSERT ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION require_active_supplier_for_new_po();

CREATE FUNCTION enforce_purchase_order_approval_lifecycle() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.approval_status <> 'Draft' THEN
      RAISE EXCEPTION 'New purchase orders must start in Draft';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.approval_status = NEW.approval_status THEN RETURN NEW; END IF;
  IF OLD.approval_status = 'Draft' AND NEW.approval_status = 'Pending Approval' THEN
    RETURN NEW;
  END IF;
  IF OLD.approval_status = 'Pending Approval'
     AND NEW.approval_status IN ('Approved', 'Rejected') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invalid purchase order approval transition: % -> %',
    OLD.approval_status, NEW.approval_status;
END;
$$;

CREATE TRIGGER purchase_order_approval_guard
BEFORE INSERT OR UPDATE OF approval_status ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION enforce_purchase_order_approval_lifecycle();

CREATE FUNCTION enforce_purchase_order_receiving_lifecycle() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.receiving_status <> 'Unreceived' THEN
      RAISE EXCEPTION 'New purchase orders must start Unreceived';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.receiving_status = NEW.receiving_status THEN RETURN NEW; END IF;
  IF NEW.approval_status <> 'Approved' THEN
    RAISE EXCEPTION 'Receiving is available only after PO approval';
  END IF;
  IF OLD.receiving_status = 'Unreceived'
     AND NEW.receiving_status IN ('Partially Received', 'Received') THEN
    RETURN NEW;
  END IF;
  IF OLD.receiving_status = 'Partially Received'
     AND NEW.receiving_status = 'Received' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invalid purchase order receiving transition: % -> %',
    OLD.receiving_status, NEW.receiving_status;
END;
$$;

CREATE TRIGGER purchase_order_receiving_guard
BEFORE INSERT OR UPDATE OF receiving_status ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION enforce_purchase_order_receiving_lifecycle();

-- Useful tenant-scoped list and relationship indexes.
CREATE INDEX inventory_products_tenant_name_idx ON inventory_products (tenant_id, name);
CREATE INDEX customers_tenant_name_idx ON customers (tenant_id, name);
CREATE INDEX sales_orders_tenant_date_idx ON sales_orders (tenant_id, order_date DESC, id);
CREATE INDEX sales_orders_tenant_status_date_idx
  ON sales_orders (tenant_id, status, order_date DESC, id);
CREATE INDEX sales_order_lines_order_idx ON sales_order_lines (tenant_id, sales_order_id);
CREATE INDEX suppliers_tenant_status_name_idx ON suppliers (tenant_id, status, name);
CREATE INDEX purchase_orders_tenant_date_idx ON purchase_orders (tenant_id, created_at DESC, id);
CREATE INDEX purchase_orders_tenant_approval_date_idx
  ON purchase_orders (tenant_id, approval_status, created_at DESC, id);
CREATE INDEX purchase_orders_tenant_expected_date_idx
  ON purchase_orders (tenant_id, expected_delivery_date)
  WHERE receiving_status <> 'Received' AND expected_delivery_date IS NOT NULL;
CREATE INDEX purchase_order_lines_order_idx
  ON purchase_order_lines (tenant_id, purchase_order_id);

-- Tenant context helper. If no tenant is set, it returns NULL and tenant
-- equality policies deny access by evaluating to NULL (not TRUE).
CREATE FUNCTION app_current_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.current_tenant_id', true), '')::uuid
$$;

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON tenants
  USING (id = app_current_tenant_id())
  WITH CHECK (id = app_current_tenant_id());

ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON tenant_memberships
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE tenant_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON tenant_roles
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE role_permission_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission_claims FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON role_permission_claims
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE membership_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON membership_roles
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_products FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON inventory_products
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON customers
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE customer_sensitive_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sensitive_details FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON customer_sensitive_details
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON sales_orders
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON sales_order_lines
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON suppliers
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE supplier_financial_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_financial_details FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON supplier_financial_details
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON purchase_orders
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_scope ON purchase_order_lines
  USING (tenant_id = app_current_tenant_id())
  WITH CHECK (tenant_id = app_current_tenant_id());

COMMIT;

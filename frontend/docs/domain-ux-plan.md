# Milestone C — Domain UX plan

**Status:** UX proposal plus frontend domain contracts. Inventory, sales, and purchasing routes remain placeholders. Approved Sales, Purchasing, and shared decisions now have pure TypeScript types/helpers; API calls, persisted transactions, and authoritative enforcement remain deferred to Django.

## Shared design rules

- Keep the existing ERP shell and route URLs. Use `/inventory`, `/sales`, and `/purchasing` for the first list screens.
- Use the shared `PageContainer`, `DataTable`, `Badge`, `EmptyState`, `ErrorState`, and skeleton components.
- Keep feature types, mock data, and data access boundaries in `src/features/{feature}/`. Keep rendering components presentational and pass them typed props.
- Use read-only detail screens first. Add create, edit, delete, receive, ship, payment, or adjustment actions only when the workflow, permissions, and supporting API operations are defined.
- Show only sample data marked as demo until a real data source exists. Do not infer missing values or calculate business results in UI components.

## Inventory UX

### List: `/inventory`

- Page heading: **Inventory** with a concise description of the catalog and stock overview.
- Search by product name or SKU.
- Initial filters: category and stock status. Add a location filter only after multi-location behavior is confirmed.
- Table columns: SKU, product, category, on hand, reserved (if provided), available (only if defined by the source), stock status, and row actions.
- Make the product name the row heading and open a read-only product detail view.
- Proposed display statuses: **In stock**, **Low stock**, and **Out of stock**. The low-stock threshold and whether reservations affect availability are decisions for the domain owner; the frontend must not define them.
- Empty results should distinguish an empty catalog from filters that match no products. Offer “Clear filters” for the latter. Do not show a create-product action until that workflow is approved.

### Detail: proposed `/inventory/[productId]`

- Product identity: name, SKU, category, and any approved descriptive fields.
- Stock panel: show only quantities supplied or defined by the agreed inventory contract. Label units clearly.
- Activity section: reserve space for stock movement history; do not fabricate adjustments or expose edit controls in this milestone.
- Provide a clear route back to the inventory list and preserve the user's search/filter state if routing supports it.

### Required states

- Loading: product rows and detail sections use shared skeletons only while real or delayed data is loading.
- Empty: no products; no products match filters; distinguish the two cases.
- Error: explain that inventory could not be loaded and provide retry when retrying is meaningful.

## Sales UX

### List: `/sales`

- Page heading: **Sales** with a concise description of customer orders.
- Search by order reference or customer name.
- Initial filters: order status and date range. Add payment or fulfillment filters only if those concepts exist in the approved workflow.
- Table columns: order reference, customer, order date, total (with currency), status, and row actions.
- Make the order reference the row heading and open a read-only order detail view.
- Use `SalesCustomerSummary` for list-safe operational fields. Keep tax ID, credit limit, and billing/shipping addresses in the detail-only `SalesCustomerSensitiveDetails` type.
- Do not add order creation, payment capture, cancellation, shipment, or refund behavior in this UX planning milestone.

### Detail: proposed `/sales/[orderId]`

- Summary: order reference, date, customer reference, and current status.
- Sections: line items, quantities and prices as supplied, order totals, and payment/fulfillment summaries only when those are part of the agreed data contract.
- Order, payment, and fulfillment states use the explicit unions in `src/features/sales/types.ts`. Lifecycle and edit/cancel rules are in `src/features/sales/domain.ts`; status badges remain display-only.

### Required states

- Loading: shared list/detail skeletons while data is pending.
- Empty: distinguish no orders from no results for current search or filters.
- Error: explain the failure and offer retry when supported.

## Purchasing UX

### Purchase orders: `/purchasing`

- Use **Purchasing** as the page heading and make purchase orders the initial view.
- Search by purchase-order reference or supplier name.
- Initial filters: order status and date range. Show expected delivery only when the source provides it.
- Table columns: purchase-order reference, supplier, created date, expected date (if known), total (with currency), status, and row actions.
- Make the purchase-order reference the row heading and open a read-only detail view.
- Do not add submit, approve, receive, or close UI actions until the corresponding API operations, permissions, and interaction design exist.

### Purchase-order detail: proposed `/purchasing/orders/[purchaseOrderId]`

- Summary: reference, supplier, dates, total, and current status.
- Sections: ordered items, quantities, unit and totals as supplied, and receiving history only after that concept is defined.
- Keep supplier details as a navigable reference; do not duplicate or edit supplier records from this screen.

### Suppliers: proposed `/purchasing/suppliers`

- Design a read-only supplier list and detail view with approved business identity fields and an optional active/inactive status.
- Contact fields, tax identifiers, payment terms, and supplier creation/editing remain out of scope until requirements and access rules are confirmed.

### Required states

- Loading: shared table/detail skeletons while data is pending.
- Empty: distinguish no suppliers or orders from filters with no matches.
- Error: provide an explanation and retry when supported.

## Naming and type conventions

These are proposed conventions for review; they do not define API contracts.

- Use feature folders: `src/features/inventory/`, `src/features/sales/`, and `src/features/purchasing/`.
- Keep the current simple feature file pattern: `types.ts` for domain-facing types, `data.ts` for clearly marked local preview data, and `service.ts` for the feature data-access boundary. Add files only when the feature needs them.
- Use singular PascalCase entity names: `Product`, `SalesOrder`, `PurchaseOrder`, and `Supplier`. Use descriptive view types such as `ProductListItem` and `SalesOrderDetail` when the fields differ by screen.
- Use `*Id` for opaque entity identifiers (for example, `productId`). Keep IDs as `string` until the backend contract specifies a concrete representation.
- Use explicit string unions for approved status sets. Keep undecided workflows unmodeled until their owners confirm the allowed values.
- Avoid `any`. Model missing values with intentional optional or nullable fields and render them consistently.
- Keep API request/response DTOs separate from UI view types once an API contract exists. Do not invent Django serializer shapes in this milestone.
- Keep formatting helpers separate from business rules. Format dates, quantities, and currency at the UI boundary using an agreed locale and currency; do not calculate stock availability, order totals, or status transitions in components.
- Keep component props typed and presentational. Feature services own data retrieval; UI components do not contain URLs or fetch logic.

## Remaining domain decisions

1. Inventory: base UoM/conversions, warehouse/location balances, reservation allocation, and low-stock fallback precedence. SKU normalization and the availability-check contract are implemented; tenant uniqueness enforcement remains Django/database work.
2. Sales, Purchasing, and shared frontend policies are recorded below and have pure helpers. Backend enforcement, tenant identity source, user/role assignment, and concrete API payload schemas remain to be agreed with Django.

The routes remain UX plans and read-only presentation work. The contracts below do not add sample transactions, screens, network calls, or backend security enforcement.

## Decision 1 implementation — SKU uniqueness

- Canonicalize entered SKUs by trimming surrounding whitespace and converting to uppercase through `normalizeSku` in `src/features/inventory/sku.ts`.
- `createDebouncedSkuAvailabilityChecker` provides a 300 ms default debounce, cancels/supersedes stale checks, passes tenant and optional excluded product identifiers, and supplies an `AbortSignal` to the future API adapter.
- Empty normalized values are reported as required-field errors; format rules are intentionally not invented here.
- The availability lookup is injected. No fake local catalog, endpoint, form, or Django integration is added while those are deferred.
- This check is advisory only. The authoritative backend/database must normalize identically and atomically enforce SKU uniqueness within each tenant to handle concurrent creates. The UI should treat lookup failures as “could not verify,” not as confirmation that a SKU is available.
- When a product form is introduced, show the result only for the latest input, cancel on unmount, and still handle the backend duplicate response on submission.

## Decision 2 implementation — Sales

- `src/features/sales/types.ts` defines separate order (`Draft`, `Confirmed`, `Processing`, `Completed`, `Cancelled`), payment (`Unpaid`, `Partial`, `Paid`), and fulfillment (`Unfulfilled`, `Partial`, `Shipped`) states.
- `domain.ts` enforces the forward order lifecycle, allows line edits only in Draft, permits cancellation only before shipment, and points shipped/partially shipped orders to a separate return/credit workflow. Completion requires Shipped fulfillment.
- List-safe customer operational fields and sensitive detail fields have separate types. No customer data or UI was fabricated.

## Decision 3 implementation — Purchasing

- `src/features/purchasing/types.ts` defines supplier, approval, receiving, order summary, and split operational/financial supplier fields.
- `domain.ts` allows new POs only for Active suppliers; approval follows Draft → Pending Approval → Approved/Rejected; receiving transitions are possible only after approval.
- Expected-date indicators are display-only. The due-soon window is supplied by configuration, overdue POs remain receivable when approved, and received orders stop showing date risk.
- Supplier financial visibility is represented by the `suppliers:read-financial` claim; server/API checks remain mandatory.

## Decision 4 implementation — shared foundation

- `src/lib/money.ts` models currency amounts as integer minor units or exact decimal strings and formats them with `Intl.NumberFormat` using ISO currency precision without converting exact decimal strings through floating point.
- `src/lib/date-time.ts` distinguishes UTC instants from calendar dates, validates them, formats timestamps in a supplied organization time zone, and formats date-only values in UTC to avoid shifting the day.
- `src/lib/list-query.ts` parses and writes URL-backed page, pageSize, search, sort, and direction state; it bounds page size/search and allowlists sort fields.
- `src/lib/permissions.ts` defines granular claims and UI capability helpers. These do not replace backend authorization.
- `src/lib/api-envelope.ts` defines `{ data, meta, error }` and validates the envelope with injected runtime decoders. Concrete payload schemas remain backend-contract work; no validation-library dependency or guessed Django serializer was added.


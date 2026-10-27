export function InventoryToolbar() {
  return (
    <section aria-label="Inventory filters" className="surface flex flex-col gap-3 rounded-xl border subtle-border p-4 sm:flex-row">
      <label className="flex-1 text-sm">
        <span className="mb-1 block font-medium">Search products</span>
        <input
          type="search"
          placeholder="Search by name or SKU"
          className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <label className="text-sm sm:w-56">
        <span className="mb-1 block font-medium">Warehouse</span>
        <select className="min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900" defaultValue="all">
          <option value="all">All warehouses</option>
        </select>
      </label>
    </section>
  );
}

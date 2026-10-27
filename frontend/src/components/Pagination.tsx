type PaginationProps = {
  page?: number;
  totalPages?: number;
};

export function Pagination({ page = 1, totalPages = 1 }: PaginationProps) {
  return (
    <nav aria-label="Inventory pages" className="flex items-center justify-between gap-3 text-sm">
      <span className="muted-text">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} className="rounded-lg border subtle-border px-3 py-2 disabled:opacity-50">
          Previous
        </button>
        <button type="button" disabled={page >= totalPages} className="rounded-lg border subtle-border px-3 py-2 disabled:opacity-50">
          Next
        </button>
      </div>
    </nav>
  );
}

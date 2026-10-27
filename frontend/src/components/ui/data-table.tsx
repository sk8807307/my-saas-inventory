import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";

export type DataTableColumn<Row> = {
  /** Stable key for this column within the table. */
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  /** Render this cell as the row's accessible heading. */
  rowHeader?: boolean;
  className?: string;
  headerClassName?: string;
};

export type DataTableProps<Row> = {
  /** Accessible table name, also shown to screen readers as its caption. */
  caption: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => string | number;
  /** Optional buttons or links for an individual row. */
  rowActions?: (row: Row) => ReactNode;
  /** Optional pagination controls or summary rendered below the table. */
  pagination?: ReactNode;
  emptyState?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  rowActions,
  pagination,
  emptyState,
  emptyTitle = "No records found",
  emptyDescription = "There are no records to display right now.",
}: DataTableProps<Row>) {
  const columnCount = columns.length + (rowActions ? 1 : 0);

  return (
    <div className="surface overflow-hidden rounded-xl border subtle-border">
      <div
        className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--primary)"
        role="region"
        aria-label={`${caption} table`}
        tabIndex={0}
      >
        <table className="w-full min-w-160 border-collapse text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-(--surface-hover) text-xs uppercase tracking-wide text-(--muted)">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 font-semibold ${column.headerClassName ?? ""}`}
                >
                  {column.header}
                </th>
              ))}
              {rowActions && (
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border)">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={getRowKey(row)} className="surface-hover">
                  {columns.map((column) =>
                    column.rowHeader ? (
                      <th
                        key={column.key}
                        scope="row"
                        className={`px-4 py-3 text-left font-medium ${column.className ?? ""}`}
                      >
                        {column.render(row)}
                      </th>
                    ) : (
                      <td
                        key={column.key}
                        className={`px-4 py-3 ${column.className ?? ""}`}
                      >
                        {column.render(row)}
                      </td>
                    ),
                  )}
                  {rowActions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">{rowActions(row)}</div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={Math.max(columnCount, 1)} className="p-4">
                  {emptyState ?? (
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      className="border-0 bg-transparent shadow-none"
                    />
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t subtle-border px-4 py-3">
          {pagination}
        </footer>
      )}
    </div>
  );
}

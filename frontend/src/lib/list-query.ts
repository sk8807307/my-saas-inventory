export type SortDirection = "asc" | "desc";

export type ListQuery = {
  page: number;
  pageSize: number;
  search: string;
  sort: string;
  direction: SortDirection;
};

export type ListQueryOptions = {
  allowedSortFields: readonly string[];
  defaultSort: string;
  defaultPageSize?: number;
  maxPageSize?: number;
  maxSearchLength?: number;
};

function positiveInteger(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Parse shareable list state from URL parameters with bounded input values. */
export function parseListQuery(
  params: URLSearchParams,
  options: ListQueryOptions,
): ListQuery {
  const maxPageSize = Math.max(1, Math.floor(options.maxPageSize ?? 100));
  const defaultPageSize = Math.min(
    Math.max(1, Math.floor(options.defaultPageSize ?? 25)),
    maxPageSize,
  );
  const fallbackSort = options.allowedSortFields.includes(options.defaultSort)
    ? options.defaultSort
    : options.allowedSortFields[0] ?? "";
  const requestedSort = params.get("sort") ?? fallbackSort;
  const direction = params.get("direction") === "desc" ? "desc" : "asc";

  return {
    page: positiveInteger(params.get("page"), 1),
    pageSize: Math.min(positiveInteger(params.get("pageSize"), defaultPageSize), maxPageSize),
    search: (params.get("search") ?? "").trim().slice(0, options.maxSearchLength ?? 200),
    sort: options.allowedSortFields.includes(requestedSort)
      ? requestedSort
      : fallbackSort,
    direction,
  };
}
/** Update standard list parameters while preserving unrelated filters in the URL. */
export function writeListQuery(
  current: URLSearchParams,
  query: ListQuery,
): URLSearchParams {
  const params = new URLSearchParams(current);
  params.set("page", String(Math.max(1, Math.floor(query.page))));
  params.set("pageSize", String(Math.max(1, Math.floor(query.pageSize))));
  params.set("search", query.search.trim());
  params.set("sort", query.sort);
  params.set("direction", query.direction);
  return params;
}



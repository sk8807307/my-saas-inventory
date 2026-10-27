/**
 * Canonical SKU normalization shared by forms and availability checks.
 * The backend must apply the same normalization and enforce tenant-scoped uniqueness.
 */
export function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

export type SkuAvailabilityRequest = {
  tenantId: string;
  sku: string;
  /** Excludes the current product while editing an existing product. */
  excludeProductId?: string;
};

export type SkuAvailabilityQuery = {
  tenantId: string;
  normalizedSku: string;
  excludeProductId?: string;
  signal: AbortSignal;
};

/** Implement this with the authoritative API when Django integration is added. */
export type SkuAvailabilityLookup = (
  query: SkuAvailabilityQuery,
) => Promise<boolean>;

export type SkuAvailabilityResult =
  | { status: "available"; normalizedSku: string }
  | { status: "unavailable"; normalizedSku: string }
  | { status: "invalid"; normalizedSku: ""; reason: "required" }
  | { status: "superseded"; normalizedSku: string }
  | { status: "error"; normalizedSku: string };

export type DebouncedSkuAvailabilityChecker = {
  check: (request: SkuAvailabilityRequest) => Promise<SkuAvailabilityResult>;
  /** Cancels the pending debounce or in-flight request. */
  cancel: () => void;
};

/**
 * Creates a single-field debounced checker. Each new call supersedes the prior
 * call, and aborts its request where possible. This is advisory UX validation;
 * the backend remains responsible for enforcing uniqueness atomically.
 */
export function createDebouncedSkuAvailabilityChecker(
  lookup: SkuAvailabilityLookup,
  debounceMs = 300,
): DebouncedSkuAvailabilityChecker {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let resolveCurrent:
    | ((result: SkuAvailabilityResult) => void)
    | undefined;
  let currentSku = "";
  let requestVersion = 0;

  const supersedeCurrent = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }

    controller?.abort();
    controller = undefined;

    resolveCurrent?.({ status: "superseded", normalizedSku: currentSku });
    resolveCurrent = undefined;
  };

  return {
    check(request) {
      const normalizedSku = normalizeSku(request.sku);
      supersedeCurrent();
      requestVersion += 1;
      const version = requestVersion;
      currentSku = normalizedSku;

      if (!normalizedSku) {
        return Promise.resolve({
          status: "invalid",
          normalizedSku: "",
          reason: "required",
        });
      }

      return new Promise((resolve) => {
        resolveCurrent = resolve;
        timer = setTimeout(async () => {
          timer = undefined;
          const requestController = new AbortController();
          controller = requestController;

          try {
            const available = await lookup({
              tenantId: request.tenantId,
              normalizedSku,
              excludeProductId: request.excludeProductId,
              signal: requestController.signal,
            });

            if (version !== requestVersion) return;
            resolveCurrent = undefined;
            controller = undefined;
            resolve({
              status: available ? "available" : "unavailable",
              normalizedSku,
            });
          } catch {
            if (version !== requestVersion) return;
            resolveCurrent = undefined;
            controller = undefined;
            resolve({ status: "error", normalizedSku });
          }
        }, Math.max(0, debounceMs));
      });
    },
    cancel() {
      requestVersion += 1;
      supersedeCurrent();
    },
  };
}

export type ApiError = {
  code: string;
  message: string;
  requestId?: string;
  fieldErrors?: Record<string, string[]>;
};

export type ApiSuccess<TData, TMeta = unknown> = {
  data: TData;
  meta: TMeta;
  error: null;
};

export type ApiFailure<TMeta = unknown> = {
  data: null;
  meta: TMeta;
  error: ApiError;
};

export type ApiEnvelope<TData, TMeta = unknown> =
  | ApiSuccess<TData, TMeta>
  | ApiFailure<TMeta>;

/** A small schema contract keeps API parsing library-agnostic until a backend schema is agreed. */
export type RuntimeSchema<T> = {
  parse: (value: unknown) => T;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseApiError(value: unknown): ApiError {
  if (!isRecord(value) || typeof value.code !== "string" || typeof value.message !== "string") {
    throw new TypeError("API error must include string code and message fields.");
  }

  let fieldErrors: Record<string, string[]> | undefined;
  if (value.fieldErrors !== undefined) {
    if (!isRecord(value.fieldErrors)) throw new TypeError("fieldErrors must be an object.");
    fieldErrors = {};
    for (const [field, messages] of Object.entries(value.fieldErrors)) {
      if (!Array.isArray(messages) || !messages.every((message) => typeof message === "string")) {
        throw new TypeError(`fieldErrors.${field} must be an array of strings.`);
      }
      fieldErrors[field] = messages;
    }
  }

  if (value.requestId !== undefined && typeof value.requestId !== "string") {
    throw new TypeError("requestId must be a string when provided.");
  }

  return {
    code: value.code,
    message: value.message,
    requestId: value.requestId as string | undefined,
    fieldErrors,
  };
}

/** Validates the common envelope and delegates payload validation to shared decoders. */
export function parseApiEnvelope<TData, TMeta>(
  input: unknown,
  dataSchema: RuntimeSchema<TData>,
  metaSchema: RuntimeSchema<TMeta>,
): ApiEnvelope<TData, TMeta> {
  if (!isRecord(input) || !("data" in input) || !("meta" in input) || !("error" in input)) {
    throw new TypeError("API response must include data, meta, and error fields.");
  }

  const meta = metaSchema.parse(input.meta);
  if (input.error === null) {
    return { data: dataSchema.parse(input.data), meta, error: null };
  }

  if (input.data !== null) {
    throw new TypeError("Failed API responses must set data to null.");
  }
  return { data: null, meta, error: parseApiError(input.error) };
}

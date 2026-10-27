const API_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

const genericErrorMessage = "The request failed. Please try again.";
const htmlResponseMessage = "The server returned an unexpected page. Please try again.";

/** One HTTP error type is shared by authentication and business API calls. */
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

type JsonRecord = Record<string, unknown>;
type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Send API requests to Django with the session cookie and no cached response. */
export async function fetchApi(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "Could not connect to Django. Check that the server is running.",
      0,
    );
  }
}

/** Parse JSON responses, but never show an HTML error page in the UI. */
export async function readResponse(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new ApiError("Could not read the server response.", 0);
  }

  if (!text) return null;

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const bodyStart = text.trimStart().slice(0, 40).toLowerCase();
  if (
    contentType.includes("text/html") ||
    bodyStart.startsWith("<!doctype html") ||
    bodyStart.startsWith("<html")
  ) {
    return htmlResponseMessage;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Pick a readable message from Django REST Framework or API envelope errors. */
export function getErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message || genericErrorMessage;
  if (typeof value === "string") return value || genericErrorMessage;
  if (!isRecord(value)) return genericErrorMessage;

  if (isRecord(value.error) && value.error !== value) {
    return getErrorMessage(value.error);
  }
  if (typeof value.detail === "string") return value.detail;
  if (typeof value.message === "string") return value.message;

  for (const [field, fieldValue] of Object.entries(value)) {
    if (typeof fieldValue === "string") return fieldValue;
    if (Array.isArray(fieldValue)) {
      const firstMessage = fieldValue.find(
        (item): item is string => typeof item === "string",
      );
      if (firstMessage) {
        return field === "non_field_errors"
          ? firstMessage
          : `${field}: ${firstMessage}`;
      }
    }
  }

  return genericErrorMessage;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (csrfRequest) return csrfRequest;

  csrfRequest = (async () => {
    const response = await fetchApi("/api/auth/csrf/");
    const data = await readResponse(response);

    if (!response.ok) {
      throw new ApiError(getErrorMessage(data), response.status);
    }
    if (!isRecord(data) || typeof data.csrfToken !== "string") {
      throw new ApiError("Django did not return a CSRF token.", response.status);
    }

    csrfToken = data.csrfToken;
    return csrfToken;
  })();

  try {
    return await csrfRequest;
  } finally {
    csrfRequest = null;
  }
}

/** Clear the cached token after login or logout, when Django may rotate it. */
export function resetCsrf(): void {
  csrfToken = null;
  csrfRequest = null;
}

/** Run all HTTP verbs through one place so cookies, CSRF, and errors stay consistent. */
async function request<T>(
  path: string,
  method: RequestMethod,
  body?: object,
): Promise<T> {
  const headers = new Headers();
  let serializedBody: string | undefined;

  if (method !== "GET") {
    headers.set("X-CSRFToken", await getCsrfToken());
  }
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    serializedBody = JSON.stringify(body);
  }

  const response = await fetchApi(path, {
    method,
    headers,
    body: serializedBody,
  });
  const payload = await readResponse(response);

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload), response.status);
  }

  // Business endpoints use { data, meta, error }; authentication endpoints return plain JSON.
  if (isRecord(payload) && "data" in payload && "error" in payload) {
    if (payload.error !== null) {
      throw new ApiError(getErrorMessage(payload.error), response.status);
    }
    return payload.data as T;
  }

  return payload as T;
}

export function getJson<T>(path: string): Promise<T> {
  return request<T>(path, "GET");
}

export function postJson<T>(path: string, body: object): Promise<T> {
  return request<T>(path, "POST", body);
}

export function putJson<T>(path: string, body: object): Promise<T> {
  return request<T>(path, "PUT", body);
}

export function patchJson<T>(path: string, body: object): Promise<T> {
  return request<T>(path, "PATCH", body);
}

export async function deleteJson(path: string): Promise<void> {
  await request<unknown>(path, "DELETE");
}

/** A 400 mentioning tenant means the user must select a workspace first. */
export function isTenantMissing(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return error.status === 400 && typeof error.message === "string" && /tenant/i.test(error.message);
}
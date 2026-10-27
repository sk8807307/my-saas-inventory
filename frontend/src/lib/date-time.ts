export type DateOnly = string & { readonly __dateOnly: unique symbol };
export type UtcTimestamp = string & { readonly __utcTimestamp: unique symbol };

export function isDateOnly(value: string): value is DateOnly {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseDateOnly(value: string): DateOnly {
  if (!isDateOnly(value)) throw new RangeError("Expected a valid YYYY-MM-DD date.");
  return value;
}

export function compareDateOnly(left: DateOnly | string, right: DateOnly | string): number {
  if (!isDateOnly(left) || !isDateOnly(right)) {
    throw new RangeError("Date-only values must be valid YYYY-MM-DD dates.");
  }
  return left === right ? 0 : left < right ? -1 : 1;
}

export function isUtcTimestamp(value: string): value is UtcTimestamp {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/.exec(value);
  if (!match || !isDateOnly(match[1])) return false;
  if (Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) return false;
  return !Number.isNaN(Date.parse(value));
}

export function parseUtcTimestamp(value: string): UtcTimestamp {
  if (!isUtcTimestamp(value)) {
    throw new RangeError("Expected a valid UTC ISO-8601 timestamp ending in Z.");
  }
  return new Date(value).toISOString() as UtcTimestamp;
}

export function formatUtcTimestamp(
  value: UtcTimestamp | string,
  locale: string,
  timeZone: string,
): string {
  const timestamp = parseUtcTimestamp(value);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(timestamp));
}

/** Date-only values are formatted in UTC so the calendar day cannot shift. */
export function formatDateOnly(value: DateOnly | string, locale: string): string {
  const date = parseDateOnly(value);
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}



export type CurrencyCode = string;

/** API-friendly representations; decimal strings preserve exact transport values. */
export type MoneyAmount =
  | { kind: "minor-units"; minorUnits: number; currency: CurrencyCode }
  | { kind: "decimal"; decimal: string; currency: CurrencyCode };

function decimalFromMinorUnits(minorUnits: number, fractionDigits: number): string {
  if (!Number.isSafeInteger(minorUnits)) {
    throw new RangeError("minorUnits must be a safe integer.");
  }
  const negative = minorUnits < 0 ? "-" : "";
  const digits = String(Math.abs(minorUnits)).padStart(fractionDigits + 1, "0");
  if (fractionDigits === 0) return `${negative}${digits}`;
  return `${negative}${digits.slice(0, -fractionDigits)}.${digits.slice(-fractionDigits)}`;
}

function roundDecimal(value: string, fractionDigits: number): {
  negative: boolean;
  integer: bigint;
  fraction: string;
} {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) throw new RangeError("decimal must be a plain decimal string.");

  const negative = match[1] === "-";
  const sourceFraction = match[3] ?? "";
  const keptFraction = sourceFraction.slice(0, fractionDigits).padEnd(fractionDigits, "0");
  const scale = BigInt(10) ** BigInt(fractionDigits);
  let scaled = BigInt(match[2]) * scale + BigInt(keptFraction || "0");
  if (sourceFraction.length > fractionDigits && sourceFraction[fractionDigits] >= "5") {
    scaled += BigInt(1);
  }

  return {
    negative,
    integer: scaled / scale,
    fraction: String(scaled % scale).padStart(fractionDigits, "0"),
  };
}

function localizeDigits(value: string, locale: string): string {
  const digitFormatter = new Intl.NumberFormat(locale, {
    useGrouping: false,
    maximumFractionDigits: 0,
  });
  return [...value].map((digit) => digitFormatter.format(Number(digit))).join("");
}

/** Formats without converting the exact decimal string through IEEE-754. */
export function formatMoney(amount: MoneyAmount, locale: string): string {
  if (!/^[A-Z]{3}$/.test(amount.currency)) {
    throw new RangeError("currency must be an uppercase ISO 4217 code.");
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: amount.currency,
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits;
  if (fractionDigits == undefined) {
    throw new RangeError("Failed to determine currency fraction digits.");
  }
  const decimal = amount.kind === "minor-units"
    ? decimalFromMinorUnits(amount.minorUnits, fractionDigits)
    : amount.decimal;
  const rounded = roundDecimal(decimal, fractionDigits);
  const whole = new Intl.NumberFormat(locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).format(rounded.integer);
  const decimalSeparator = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).formatToParts(1.1).find((part) => part.type === "decimal")?.value ?? ".";
  const numericValue = fractionDigits === 0
    ? whole
    : `${whole}${decimalSeparator}${localizeDigits(rounded.fraction, locale)}`;

  const parts = formatter.formatToParts(rounded.negative ? -1 : 1);
  const numericTypes = new Set(["integer", "group", "decimal", "fraction"]);
  let inserted = false;
  return parts.map((part) => {
    if (!numericTypes.has(part.type)) return part.value;
    if (inserted) return "";
    inserted = true;
    return numericValue;
  }).join("");
}

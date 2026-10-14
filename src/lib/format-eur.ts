/**
 * Euro amounts without embedding a raw "€" byte in source files (avoids mojibake on some Windows toolchains).
 */
export const EUR = "\u20AC";

/** Coerce API/MySQL decimal strings to a finite number for display math. */
export function toEurNumber(amount: unknown): number {
  if (typeof amount === "number" && Number.isFinite(amount)) return amount;
  const n = parseFloat(String(amount ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function formatEur(amount: unknown, fractionDigits = 2): string {
  return `${EUR}${toEurNumber(amount).toFixed(fractionDigits)}`;
}

/** e.g. "-€12.34" for wallet deductions */
export function formatEurMinus(amount: unknown, fractionDigits = 2): string {
  return `-${EUR}${toEurNumber(amount).toFixed(fractionDigits)}`;
}

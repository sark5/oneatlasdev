import Decimal from "decimal.js";

/**
 * Converts USD per token into USD per million tokens.
 *
 * Example:
 * 0.0000002 -> 0.2000000000
 *
 * null and undefined remain unknown prices.
 */
export function perTokenToPerMillion(
  value: unknown
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    throw new Error("Invalid token price type");
  }

  const price = new Decimal(String(value));

  if (!price.isFinite() || price.isNegative()) {
    throw new Error(
      "Token price must be finite and non-negative"
    );
  }

  return price
    .mul(1_000_000)
    .toDecimalPlaces(10, Decimal.ROUND_HALF_UP)
    .toFixed(10);
}

/**
 * Converts endpoint latency from seconds to milliseconds.
 */
export function secondsToMilliseconds(
  value: unknown
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const seconds = new Decimal(String(value));

  if (!seconds.isFinite() || seconds.isNegative()) {
    return null;
  }

  return seconds
    .mul(1000)
    .toDecimalPlaces(3)
    .toFixed(3);
}

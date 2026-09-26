// Pulls the first dollar amount out of a free-text price like "$120" or
// "$20/hr". Returns null when there's nothing to parse.
function parsePriceAmount(price: string | null | undefined): number | null {
  if (!price) return null;
  const match = price.match(/[\d,]+(?:\.\d+)?/);
  if (!match) return null;
  const n = parseFloat(match[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// price * (1 - percent/100) - flatFee, rounded up to the nearest dollar.
// Returns null when the employee has no rate configured or the price
// can't be parsed, so the caller can fall back to a manually-typed payout.
export function calculatePayout(
  price: string | null | undefined,
  payoutPercent: number | null | undefined,
  payoutFlatFee: number | null | undefined
): string | null {
  if (payoutPercent == null || payoutFlatFee == null) return null;
  const amount = parsePriceAmount(price);
  if (amount == null) return null;

  const raw = amount * (1 - payoutPercent / 100) - payoutFlatFee;
  const rounded = Math.ceil(raw);
  return `$${rounded}`;
}

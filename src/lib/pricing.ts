// BAB Tasker's standard pricing for a new business customer. Kept in one
// place so the admin console, the Stripe checkout route, and the landing
// page all quote the same numbers.
export const PRICE_PER_PROPERTY_CENTS = 400; // $4/property/month
export const SIGN_ON_FEE_CENTS = 10000; // $100 one-time

export function standardMonthlyPriceCents(propertyLimit: number): number {
  return Math.max(0, Math.round(propertyLimit)) * PRICE_PER_PROPERTY_CENTS;
}

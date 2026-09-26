import Stripe from "stripe";

// Only constructed when actually needed (inside the checkout/webhook routes),
// so the app doesn't crash at build time if the key isn't set yet.
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return new Stripe(key);
}

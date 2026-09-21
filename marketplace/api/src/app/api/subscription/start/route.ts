import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/auth";
import { isActiveSubscription, MONTHLY_SUBSCRIPTION_TRIAL_DAYS } from "@/lib/catalog";

// Starts (or resumes) the $14.99/mo membership, first month free. Because
// the trial makes the first invoice $0, there's nothing to charge yet —
// Stripe instead attaches a "pending_setup_intent" to the subscription so
// we can still collect and save a payment method up front (it's what
// gets charged automatically when the trial ends). The mobile app confirms
// that SetupIntent with the same PaymentSheet used elsewhere in the app;
// if for some reason there's no trial (e.g. the trial was removed later)
// this falls back to confirming the first invoice's PaymentIntent instead.
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "HOMEOWNER" || !user.homeownerProfile) {
    return NextResponse.json({ error: "Homeowner account required" }, { status: 403 });
  }

  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "Subscriptions aren't configured yet" }, { status: 500 });
  }

  if (isActiveSubscription(user.homeownerProfile.subscriptionStatus)) {
    return NextResponse.json({ error: "You're already subscribed" }, { status: 409 });
  }

  let stripeCustomerId = user.homeownerProfile.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name });
    stripeCustomerId = customer.id;
    await prisma.homeownerProfile.update({
      where: { id: user.homeownerProfile.id },
      data: { stripeCustomerId },
    });
  }

  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: priceId }],
    trial_period_days: MONTHLY_SUBSCRIPTION_TRIAL_DAYS,
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["pending_setup_intent", "latest_invoice.payment_intent"],
  });

  await prisma.homeownerProfile.update({
    where: { id: user.homeownerProfile.id },
    data: { stripeSubscriptionId: subscription.id, subscriptionStatus: subscription.status },
  });

  const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null;
  if (setupIntent?.client_secret) {
    return NextResponse.json({ clientSecret: setupIntent.client_secret, mode: "setup" });
  }

  const invoice = subscription.latest_invoice as (Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent }) | null;
  if (invoice?.payment_intent?.client_secret) {
    return NextResponse.json({ clientSecret: invoice.payment_intent.client_secret, mode: "payment" });
  }

  return NextResponse.json({ error: "Couldn't start checkout — try again shortly" }, { status: 500 });
}

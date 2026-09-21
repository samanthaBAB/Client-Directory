import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/auth";

// Cancels at the end of the current billing period rather than
// immediately — the homeowner already paid for the month, so they keep
// the discount (and could still book) through the period they paid for.
// subscriptionStatus flips to "canceled" via webhook once the period ends.
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "HOMEOWNER" || !user.homeownerProfile) {
    return NextResponse.json({ error: "Homeowner account required" }, { status: 403 });
  }

  if (!user.homeownerProfile.stripeSubscriptionId) {
    return NextResponse.json({ error: "No active subscription" }, { status: 409 });
  }

  const subscription = await stripe.subscriptions.update(user.homeownerProfile.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  return NextResponse.json({ status: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end });
}

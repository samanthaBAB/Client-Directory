import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/auth";

// Creates (if needed) a Stripe Express connected account for the cleaner
// and returns a fresh onboarding link. The cleaner app opens this URL
// in an in-app browser; Stripe handles identity/bank-account collection.
export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "CLEANER" || !user.cleanerProfile) {
    return NextResponse.json({ error: "Cleaner account required" }, { status: 403 });
  }

  let stripeAccountId = user.cleanerProfile.stripeAccountId;
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    stripeAccountId = account.id;
    await prisma.cleanerProfile.update({
      where: { id: user.cleanerProfile.id },
      data: { stripeAccountId },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL!,
    return_url: process.env.STRIPE_CONNECT_RETURN_URL!,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

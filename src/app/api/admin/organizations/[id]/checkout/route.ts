import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/authz";
import { getStripe } from "@/lib/stripe";
import { PRICE_PER_PROPERTY_CENTS, SIGN_ON_FEE_CENTS } from "@/lib/pricing";

// Generates a Stripe Checkout link for a business's sign-on fee + first
// month, so Samantha can send it directly to whoever's onboarding. Prices
// are built inline (price_data) rather than pre-created in the Stripe
// dashboard, since the per-property quantity varies by business.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    include: { users: { where: { role: "OWNER" }, take: 1 } },
  });
  if (!org) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return NextResponse.json({ error: "Stripe isn't configured yet — set STRIPE_SECRET_KEY." }, { status: 500 });
  }

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: org.users[0]?.email,
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;
    await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customerId } });
  }

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "BAB Tasker — Sign-On Fee" },
          unit_amount: SIGN_ON_FEE_CENTS,
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          product_data: { name: "BAB Tasker — Monthly Subscription" },
          unit_amount: PRICE_PER_PROPERTY_CENTS,
          recurring: { interval: "month" },
        },
        quantity: org.propertyLimit,
      },
    ],
    metadata: { organizationId: org.id },
    subscription_data: { metadata: { organizationId: org.id } },
    success_url: `${appUrl}/admin?checkout=success`,
    cancel_url: `${appUrl}/admin?checkout=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}

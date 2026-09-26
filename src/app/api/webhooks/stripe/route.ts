import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

// Keeps an Organization's status in sync with whether they're actually
// paying. Stripe is the source of truth here, not the admin console's
// Activate/Suspend buttons (those still work for manual overrides, e.g.
// comping a customer).
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId;
      if (organizationId && typeof session.subscription === "string") {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { stripeSubscriptionId: session.subscription, status: "ACTIVE" },
        });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "SUSPENDED" },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      if (customerId) {
        await prisma.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { status: "SUSPENDED" },
        });
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

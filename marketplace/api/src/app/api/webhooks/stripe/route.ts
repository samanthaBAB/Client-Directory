import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendPush } from "@/lib/push";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature ?? "",
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    );
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${err}` }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: "SUCCEEDED" },
      });

      const payment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId: pi.id },
        include: { jobRequest: { include: { cleaner: { include: { user: true } } } } },
      });
      if (payment?.jobRequest.cleaner) {
        sendPush(payment.jobRequest.cleaner.user.pushToken, {
          title: "You got paid",
          body: `Payment for your ${payment.jobRequest.serviceType.replace("-", " ")} clean cleared — $${(payment.amountCents / 100).toFixed(2)}.`,
          data: { jobId: payment.jobRequestId },
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: "FAILED" },
      });
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const onboarded = Boolean(account.charges_enabled && account.details_submitted);
      await prisma.cleanerProfile.updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeOnboarded: onboarded },
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

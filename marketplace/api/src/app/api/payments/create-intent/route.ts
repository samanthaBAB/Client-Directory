import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getAuthedUser } from "@/lib/auth";

const PLATFORM_FEE_BPS = 1500; // 15% platform fee, taken out of the cleaner's payout

const schema = z.object({ jobRequestId: z.string() });

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "HOMEOWNER" || !user.homeownerProfile) {
    return NextResponse.json({ error: "Homeowner account required" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const job = await prisma.jobRequest.findUnique({
    where: { id: body.data.jobRequestId },
    include: { cleaner: true, payment: true },
  });
  if (!job || job.homeownerId !== user.homeownerProfile.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (!job.cleaner?.stripeAccountId || !job.cleaner.stripeOnboarded) {
    return NextResponse.json({ error: "Cleaner hasn't finished payout setup yet" }, { status: 409 });
  }
  if (job.payment) {
    return NextResponse.json({ clientSecret: null, error: "Payment already created" }, { status: 409 });
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

  const applicationFeeAmount = Math.round((job.priceCents * PLATFORM_FEE_BPS) / 10000);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: job.priceCents,
    currency: "usd",
    customer: stripeCustomerId,
    automatic_payment_methods: { enabled: true },
    application_fee_amount: applicationFeeAmount,
    transfer_data: { destination: job.cleaner.stripeAccountId },
    metadata: { jobRequestId: job.id },
  });

  await prisma.payment.create({
    data: {
      jobRequestId: job.id,
      stripePaymentIntentId: paymentIntent.id,
      amountCents: job.priceCents,
      status: "REQUIRES_PAYMENT",
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}

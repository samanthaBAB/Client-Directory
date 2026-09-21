import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { sendPush } from "@/lib/push";
import { serviceLabel } from "@/lib/catalog";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "HOMEOWNER" || !user.homeownerProfile) {
    return NextResponse.json({ error: "Homeowner account required" }, { status: 403 });
  }
  const { id } = await params;

  const job = await prisma.jobRequest.findUnique({
    where: { id },
    include: { payment: true, cleaner: { include: { user: true } } },
  });
  if (!job || job.homeownerId !== user.homeownerProfile.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (job.status === "COMPLETED" || job.status === "CANCELED") {
    return NextResponse.json({ error: "Job can't be canceled" }, { status: 409 });
  }

  // Policy: a full refund any time before COMPLETED. No cancellation fee —
  // simplest thing that could work for launch; revisit once real usage
  // shows whether last-minute cancellations need a cutoff or a partial fee
  // to compensate the cleaner for reserved time.
  if (job.payment?.status === "SUCCEEDED") {
    await stripe.refunds.create({ payment_intent: job.payment.stripePaymentIntentId });
    await prisma.payment.update({
      where: { id: job.payment.id },
      data: { status: "REFUNDED" },
    });
  }

  const updated = await prisma.jobRequest.update({
    where: { id },
    data: { status: "CANCELED" },
  });

  if (job.cleaner) {
    sendPush(job.cleaner.user.pushToken, {
      title: "Job canceled",
      body: `The homeowner canceled the ${serviceLabel(job.serviceType)} scheduled for ${new Date(job.scheduledFor).toLocaleDateString()}.`,
      data: { jobId: job.id },
    });
  }

  return NextResponse.json(updated);
}

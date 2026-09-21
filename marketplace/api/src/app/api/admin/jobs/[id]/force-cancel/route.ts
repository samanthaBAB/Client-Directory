import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { sendPush } from "@/lib/push";
import { serviceLabel } from "@/lib/catalog";

// Same refund-then-cancel behavior as the homeowner-initiated cancel
// (src/app/api/jobs/[id]/cancel/route.ts), but for support/ops use: no
// ownership check, and it works on any non-terminal job regardless of who
// posted it — e.g. resolving a dispute or a job stuck from a bug.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthedUser(req);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin account required" }, { status: 403 });
  }
  const { id } = await params;

  const job = await prisma.jobRequest.findUnique({
    where: { id },
    include: {
      payment: true,
      cleaner: { include: { user: true } },
      homeowner: { include: { user: true } },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status === "COMPLETED" || job.status === "CANCELED") {
    return NextResponse.json({ error: "Job can't be canceled" }, { status: 409 });
  }

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

  const notice = {
    title: "Job canceled",
    body: `Support canceled the ${serviceLabel(job.serviceType)} scheduled for ${new Date(job.scheduledFor).toLocaleDateString()}.`,
    data: { jobId: job.id },
  };
  sendPush(job.homeowner.user.pushToken, notice);
  if (job.cleaner) sendPush(job.cleaner.user.pushToken, notice);

  return NextResponse.json(updated);
}

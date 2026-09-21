import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { sendPush, sendPushToMany } from "@/lib/push";
import { serviceLabel } from "@/lib/catalog";

const LATE_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

// A cleaner backing out of a job they already accepted — as opposed to
// declining before accepting, which has no consequence. Per policy (see
// CLEANER_POLICIES in src/lib/catalog.ts), canceling within 24h of the
// scheduled time disables the account; no-shows are handled separately
// via the admin dashboard since they can't be auto-detected.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "CLEANER" || !user.cleanerProfile) {
    return NextResponse.json({ error: "Cleaner account required" }, { status: 403 });
  }
  const { id } = await params;

  const job = await prisma.jobRequest.findUnique({
    where: { id },
    include: { payment: true, homeowner: { include: { user: true } } },
  });
  if (!job || job.cleanerId !== user.cleanerProfile.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (job.status !== "ACCEPTED" && job.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "This job can't be canceled" }, { status: 409 });
  }

  const isLate = job.scheduledFor.getTime() - Date.now() < LATE_CANCEL_WINDOW_MS;

  if (job.payment?.status === "SUCCEEDED") {
    // Payment already routed to this specific cleaner's connected Stripe
    // account — reassigning to a different cleaner can't be done without
    // re-routing that money, so treat this like a full cancellation
    // (refund + done) rather than reopening the job for someone else.
    await stripe.refunds.create({ payment_intent: job.payment.stripePaymentIntentId });
    await prisma.payment.update({ where: { id: job.payment.id }, data: { status: "REFUNDED" } });
    await prisma.jobRequest.update({ where: { id }, data: { status: "CANCELED" } });

    sendPush(job.homeowner.user.pushToken, {
      title: "Your cleaner canceled",
      body: `Your cleaner had to cancel your ${serviceLabel(job.serviceType)}. You've been refunded in full — please rebook when you're ready.`,
      data: { jobId: job.id },
    });
  } else {
    // Not yet paid — safe to reopen for another cleaner to pick up.
    await prisma.jobRequest.update({ where: { id }, data: { status: "PENDING", cleanerId: null } });
    await prisma.jobDecline.upsert({
      where: { jobRequestId_cleanerId: { jobRequestId: id, cleanerId: user.cleanerProfile.id } },
      create: { jobRequestId: id, cleanerId: user.cleanerProfile.id },
      update: {},
    });

    sendPush(job.homeowner.user.pushToken, {
      title: "Your cleaner canceled",
      body: `Your cleaner had to back out of your ${serviceLabel(job.serviceType)}. We're finding you a replacement.`,
      data: { jobId: job.id },
    });

    const otherCleaners = await prisma.cleanerProfile.findMany({
      where: { stripeOnboarded: true, id: { not: user.cleanerProfile.id } },
      include: { user: true },
    });
    sendPushToMany(
      otherCleaners.map((c) => c.user.pushToken),
      { title: "Job reopened", body: `A ${serviceLabel(job.serviceType)} just opened back up.`, data: { jobId: job.id } },
    );
  }

  if (isLate) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        disabled: true,
        disabledReason: "Canceled an accepted job within 24 hours of its scheduled time.",
      },
    });
    return NextResponse.json({
      ok: true,
      accountDisabled: true,
      message: "This job was canceled within 24 hours of its scheduled time, so your account has been disabled.",
    });
  }

  return NextResponse.json({ ok: true, accountDisabled: false });
}

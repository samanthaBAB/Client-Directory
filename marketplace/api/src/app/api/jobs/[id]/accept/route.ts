import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";
import { sendPush } from "@/lib/push";
import { serviceLabel } from "@/lib/catalog";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "CLEANER" || !user.cleanerProfile) {
    return NextResponse.json({ error: "Cleaner account required" }, { status: 403 });
  }
  const { id } = await params;

  // Guard against two cleaners accepting the same job at once: only
  // succeeds if it's still PENDING at the moment of the update.
  const result = await prisma.jobRequest.updateMany({
    where: { id, status: "PENDING" },
    data: { cleanerId: user.cleanerProfile.id, status: "ACCEPTED" },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "This job is no longer available — someone else already accepted it." },
      { status: 409 },
    );
  }

  const job = await prisma.jobRequest.findUnique({
    where: { id },
    include: { address: true, homeowner: { include: { user: true } } },
  });

  if (job) {
    sendPush(job.homeowner.user.pushToken, {
      title: "A cleaner accepted your job",
      body: `${user.name} accepted your ${serviceLabel(job.serviceType)} — pay now to confirm.`,
      data: { jobId: job.id },
    });
  }

  return NextResponse.json(job);
}

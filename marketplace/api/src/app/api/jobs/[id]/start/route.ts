import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";
import { sendPush } from "@/lib/push";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "CLEANER" || !user.cleanerProfile) {
    return NextResponse.json({ error: "Cleaner account required" }, { status: 403 });
  }
  const { id } = await params;

  const result = await prisma.jobRequest.updateMany({
    where: { id, cleanerId: user.cleanerProfile.id, status: "ACCEPTED" },
    data: { status: "IN_PROGRESS" },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Job isn't accepted yet, or isn't yours" }, { status: 409 });
  }

  const job = await prisma.jobRequest.findUnique({
    where: { id },
    include: { homeowner: { include: { user: true } } },
  });

  if (job) {
    sendPush(job.homeowner.user.pushToken, {
      title: "Your cleaner has started",
      body: `${user.name} is cleaning your home now.`,
      data: { jobId: job.id },
    });
  }

  return NextResponse.json(job);
}

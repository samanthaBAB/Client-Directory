import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "CLEANER" || !user.cleanerProfile) {
    return NextResponse.json({ error: "Cleaner account required" }, { status: 403 });
  }
  const { id } = await params;

  const job = await prisma.jobRequest.findUnique({ where: { id } });
  if (!job || job.cleanerId !== user.cleanerProfile.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (job.status !== "ACCEPTED" && job.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "Job isn't in progress" }, { status: 409 });
  }

  const updated = await prisma.jobRequest.update({
    where: { id },
    data: { status: "COMPLETED" },
  });
  return NextResponse.json(updated);
}

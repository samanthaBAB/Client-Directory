import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "HOMEOWNER" || !user.homeownerProfile) {
    return NextResponse.json({ error: "Homeowner account required" }, { status: 403 });
  }
  const { id } = await params;

  const job = await prisma.jobRequest.findUnique({ where: { id } });
  if (!job || job.homeownerId !== user.homeownerProfile.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (job.status === "COMPLETED" || job.status === "CANCELED") {
    return NextResponse.json({ error: "Job can't be canceled" }, { status: 409 });
  }

  const updated = await prisma.jobRequest.update({
    where: { id },
    data: { status: "CANCELED" },
  });
  return NextResponse.json(updated);
}

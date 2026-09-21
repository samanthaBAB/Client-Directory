import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "CLEANER" || !user.cleanerProfile) {
    return NextResponse.json({ error: "Cleaner account required" }, { status: 403 });
  }
  const { id } = await params;

  await prisma.jobDecline.upsert({
    where: { jobRequestId_cleanerId: { jobRequestId: id, cleanerId: user.cleanerProfile.id } },
    create: { jobRequestId: id, cleanerId: user.cleanerProfile.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const job = await prisma.jobRequest.findUnique({
    where: { id },
    include: {
      address: true,
      homeowner: { include: { user: true } },
      cleaner: { include: { user: true } },
      payment: true,
      review: true,
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const owns =
    (user.role === "HOMEOWNER" && job.homeownerId === user.homeownerProfile?.id) ||
    (user.role === "CLEANER" &&
      (job.status === "PENDING" || job.cleanerId === user.cleanerProfile?.id));
  if (!owns) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(job);
}

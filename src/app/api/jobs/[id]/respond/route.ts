import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeJob } from "@/lib/serialize";
import { sendSms } from "@/lib/sms";

// A cleaner accepting or declining a job offer. Only the employee it was
// offered to can respond, and only while it's still pending — this is the
// whole point of the 1099-friendly flow: the business offers, the
// contractor decides.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const decision = body.decision === "accept" ? "accept" : body.decision === "decline" ? "decline" : null;
  if (!decision) return NextResponse.json({ error: "decision must be 'accept' or 'decline'" }, { status: 400 });

  const job = await prisma.job.findUnique({ where: { id } });
  if (
    !job ||
    job.organizationId !== session.user.organizationId ||
    job.assignedToId !== session.user.id ||
    job.assignmentStatus !== "PENDING"
  ) {
    return NextResponse.json({ error: "This offer is no longer available to respond to." }, { status: 403 });
  }

  const label = job.property || [job.address, job.city, job.state].filter(Boolean).join(", ") || "a job";

  if (decision === "accept") {
    const updated = await prisma.job.update({ where: { id }, data: { assignmentStatus: "ACCEPTED" } });
    return NextResponse.json(serializeJob(updated, { includePrice: false }));
  }

  const updated = await prisma.job.update({
    where: { id },
    data: { assignedToId: null, assignmentStatus: "NONE" },
  });

  const employee = await prisma.user.findUnique({ where: { id: session.user.id } });
  const owners = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId, role: { in: ["OWNER", "ADMIN"] } },
  });
  await Promise.all(
    owners.map((o) =>
      sendSms(o.phone, `BAB Tasker: ${employee?.name ?? "A cleaner"} declined the job offer for ${label}. It's back to unassigned.`)
    )
  );

  return NextResponse.json(serializeJob(updated, { includePrice: false }));
}

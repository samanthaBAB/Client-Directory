import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeJob } from "@/lib/serialize";
import { sendSms } from "@/lib/sms";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = isOwnerLevel(session.user.role);
  const where = owner
    ? { organizationId: session.user.organizationId }
    : { organizationId: session.user.organizationId, assignedToId: session.user.id };
  const jobs = await prisma.job.findMany({ where, orderBy: { createdAt: "asc" } });
  return NextResponse.json(jobs.map((j) => serializeJob(j, { includePrice: owner })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId || !isOwnerLevel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const organizationId = session.user.organizationId;

  const body = await req.json();
  if (!body.customer || !String(body.customer).trim()) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const currentCount = await prisma.job.count({ where: { organizationId } });
  if (currentCount >= org.propertyLimit) {
    return NextResponse.json(
      { error: `You've reached your plan's limit of ${org.propertyLimit} properties. Contact us to upgrade.` },
      { status: 403 }
    );
  }

  let assignedToId: string | null = body.assignedTo || null;
  if (assignedToId) {
    const employee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!employee || employee.organizationId !== organizationId) assignedToId = null;
  }

  const job = await prisma.job.create({
    data: {
      organizationId,
      customer: String(body.customer).trim(),
      property: body.property?.trim() || null,
      serviceType: body.serviceType || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      price: body.price?.trim() || null,
      payout: body.payout?.trim() || null,
      phone: body.phone?.trim() || null,
      schedule: body.schedule?.trim() || null,
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      sameDayCheckIn: !!body.sameDayCheckIn,
      accessCode: body.accessCode?.trim() || null,
      keyLocation: body.keyLocation?.trim() || null,
      suppliesLocation: body.suppliesLocation?.trim() || null,
      ownerNote: body.ownerNote?.trim() || null,
      damageNote: body.damageNote?.trim() || null,
      notes: body.notes?.trim() || null,
      assignedToId,
      assignmentStatus: assignedToId ? "PENDING" : "NONE",
    },
  });

  if (job.assignedToId) {
    const employee = await prisma.user.findUnique({ where: { id: job.assignedToId } });
    if (employee) {
      const label = job.property || [job.address, job.city, job.state].filter(Boolean).join(", ") || "a job";
      const payoutLine = job.payout ? ` Pay: ${job.payout}.` : "";
      await sendSms(employee.phone, `BAB Tasker: You have a new job offer — ${label}.${payoutLine} Open the app to accept or decline.`);
    }
  }

  return NextResponse.json(serializeJob(job), { status: 201 });
}

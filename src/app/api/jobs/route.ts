import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeJob } from "@/lib/serialize";
import { sendSms } from "@/lib/sms";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = isOwnerLevel(session.user.role) ? {} : { assignedToId: session.user.id };
  const jobs = await prisma.job.findMany({ where, orderBy: { createdAt: "asc" } });
  return NextResponse.json(jobs.map(serializeJob));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isOwnerLevel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.customer || !String(body.customer).trim()) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      customer: String(body.customer).trim(),
      property: body.property?.trim() || null,
      serviceType: body.serviceType || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      state: body.state?.trim() || null,
      price: body.price?.trim() || null,
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
      assignedToId: body.assignedTo || null,
    },
  });

  if (job.assignedToId) {
    const employee = await prisma.user.findUnique({ where: { id: job.assignedToId } });
    if (employee) {
      const label = job.property || [job.address, job.city, job.state].filter(Boolean).join(", ") || "a job";
      await sendSms(employee.phone, `BAB Tasker: You've been assigned a new job — ${label}. Open the app for details.`);
    }
  }

  return NextResponse.json(serializeJob(job), { status: 201 });
}

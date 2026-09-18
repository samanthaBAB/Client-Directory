import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeVisit } from "@/lib/serialize";
import { sendSms } from "@/lib/sms";
import { todayStr } from "@/lib/time";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employeeIdParam = req.nextUrl.searchParams.get("employeeId");
  const owner = isOwnerLevel(session.user.role);

  let employeeId: string;
  if (owner && employeeIdParam) {
    employeeId = employeeIdParam;
  } else if (owner && !employeeIdParam) {
    const visits = await prisma.visit.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(visits.map(serializeVisit));
  } else {
    employeeId = session.user.id;
  }

  const visits = await prisma.visit.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(visits.map(serializeVisit));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isOwnerLevel(session.user.role)) {
    return NextResponse.json({ error: "Only cleaners log visits" }, { status: 403 });
  }

  const body = await req.json();
  const jobId = String(body.jobId ?? "");
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const addrLine = [job.address, job.city, job.state].filter(Boolean).join(", ");
  const label = job.property || addrLine || "the job";
  const status = body.status === "in_progress" ? "IN_PROGRESS" : "COMPLETED";

  const visit = await prisma.visit.create({
    data: {
      jobId: job.id,
      jobLabel: label,
      employeeId: session.user.id,
      date: body.date || todayStr(),
      status,
      startedAt: status === "IN_PROGRESS" ? new Date() : null,
      endedAt: null,
      note: body.note?.trim() || null,
      sameDayCheckIn: !!job.sameDayCheckIn,
    },
  });

  if (status === "IN_PROGRESS") {
    const employee = await prisma.user.findUnique({ where: { id: session.user.id } });
    await sendSms(employee?.phone, `BAB Tasker: You started the clean at ${label}.`);
  }

  return NextResponse.json(serializeVisit(visit), { status: 201 });
}

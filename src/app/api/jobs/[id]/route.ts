import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeJob } from "@/lib/serialize";
import { sendSms } from "@/lib/sms";

const OWNER_EDITABLE_FIELDS = [
  "customer",
  "property",
  "serviceType",
  "address",
  "city",
  "state",
  "price",
  "phone",
  "schedule",
  "startTime",
  "endTime",
  "sameDayCheckIn",
  "accessCode",
  "keyLocation",
  "suppliesLocation",
  "ownerNote",
  "damageNote",
  "notes",
  "assignedTo",
] as const;

const EMPLOYEE_EDITABLE_FIELDS = ["ownerNote", "damageNote", "notes"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const owner = isOwnerLevel(session.user.role);

  if (!owner && existing.assignedToId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowedFields = owner ? OWNER_EDITABLE_FIELDS : EMPLOYEE_EDITABLE_FIELDS;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (!(field in body)) continue;
    if (field === "assignedTo") {
      data.assignedToId = body.assignedTo || null;
    } else if (field === "sameDayCheckIn") {
      data.sameDayCheckIn = !!body.sameDayCheckIn;
    } else {
      const v = body[field];
      data[field] = typeof v === "string" ? v.trim() || null : v;
    }
  }

  const updated = await prisma.job.update({ where: { id }, data });

  const assignmentChanged =
    owner && "assignedTo" in body && updated.assignedToId && updated.assignedToId !== existing.assignedToId;
  if (assignmentChanged) {
    const employee = await prisma.user.findUnique({ where: { id: updated.assignedToId! } });
    if (employee) {
      const label =
        updated.property || [updated.address, updated.city, updated.state].filter(Boolean).join(", ") || "a job";
      await sendSms(employee.phone, `BAB Tasker: You've been assigned a new job — ${label}. Open the app for details.`);
    }
  }

  return NextResponse.json(serializeJob(updated));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !isOwnerLevel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

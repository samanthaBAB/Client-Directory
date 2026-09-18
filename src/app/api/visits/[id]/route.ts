import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { serializeVisit } from "@/lib/serialize";
import { sendSms } from "@/lib/sms";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit || visit.employeeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (body.status !== "completed") {
    return NextResponse.json({ error: "Unsupported update" }, { status: 400 });
  }

  const updated = await prisma.visit.update({
    where: { id },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      note: body.note?.trim() || null,
    },
  });

  const employee = await prisma.user.findUnique({ where: { id: session.user.id } });
  await sendSms(employee?.phone, `BAB Tasker: You finished the clean at ${visit.jobLabel}. Nice work!`);

  return NextResponse.json(serializeVisit(updated));
}

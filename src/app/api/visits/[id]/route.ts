import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeVisit } from "@/lib/serialize";
import { sendSms } from "@/lib/sms";
import { parsePriceAmount } from "@/lib/payout";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const visit = await prisma.visit.findUnique({ where: { id }, include: { employee: true } });
  if (!visit || visit.employee.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 404 });
  }

  const body = await req.json();
  const owner = isOwnerLevel(session.user.role);

  // Owner/admin: mark a completed visit's payout as paid or unpaid. Kept as
  // its own branch (rather than merged into the completion flow below)
  // since it's a separate action taken later, often in a batch, from the
  // payroll view — not something a cleaner can set on their own visit.
  if (owner && "payoutPaid" in body) {
    const updated = await prisma.visit.update({
      where: { id },
      data: {
        payoutPaid: !!body.payoutPaid,
        payoutPaidAt: body.payoutPaid ? new Date() : null,
      },
    });
    return NextResponse.json(serializeVisit(updated));
  }

  if (visit.employeeId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (body.status !== "completed") {
    return NextResponse.json({ error: "Unsupported update" }, { status: 400 });
  }

  const job = visit.jobId ? await prisma.job.findUnique({ where: { id: visit.jobId } }) : null;

  const updated = await prisma.visit.update({
    where: { id },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      note: body.note?.trim() || null,
      payoutAmount: parsePriceAmount(job?.payout),
    },
  });

  const employee = await prisma.user.findUnique({ where: { id: session.user.id } });
  await sendSms(employee?.phone, `BAB Tasker: You finished the clean at ${visit.jobLabel}. Nice work!`);

  return NextResponse.json(serializeVisit(updated));
}

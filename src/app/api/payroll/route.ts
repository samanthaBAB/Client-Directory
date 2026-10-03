import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeVisit } from "@/lib/serialize";

// Owner/admin only: a year-end payroll summary — what was paid (and still
// owed) to each employee, built from the payoutAmount snapshotted on each
// completed visit. `date` on Visit is a plain "YYYY-MM-DD" string, so a
// year is just a string prefix match, no date-object range math needed.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId || !isOwnerLevel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const year = req.nextUrl.searchParams.get("year") || String(new Date().getFullYear());
  if (!/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const visits = await prisma.visit.findMany({
    where: {
      status: "COMPLETED",
      date: { startsWith: year },
      employee: { organizationId: session.user.organizationId },
    },
    include: { employee: true },
    orderBy: { date: "desc" },
  });

  const byEmployee = new Map<
    string,
    { employeeId: string; employeeName: string; paid: number; unpaid: number; unrecorded: number; visits: ReturnType<typeof serializeVisit>[] }
  >();

  for (const v of visits) {
    const key = v.employeeId;
    if (!byEmployee.has(key)) {
      byEmployee.set(key, { employeeId: key, employeeName: v.employee.name, paid: 0, unpaid: 0, unrecorded: 0, visits: [] });
    }
    const entry = byEmployee.get(key)!;
    if (v.payoutAmount == null) {
      entry.unrecorded += 1;
    } else if (v.payoutPaid) {
      entry.paid += v.payoutAmount;
    } else {
      entry.unpaid += v.payoutAmount;
    }
    entry.visits.push(serializeVisit(v));
  }

  const employees = Array.from(byEmployee.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return NextResponse.json({
    year,
    employees,
    totals: {
      paid: employees.reduce((s, e) => s + e.paid, 0),
      unpaid: employees.reduce((s, e) => s + e.unpaid, 0),
      unrecorded: employees.reduce((s, e) => s + e.unrecorded, 0),
    },
  });
}

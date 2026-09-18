import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import { todayStr, nowMinutesOfDay, timeStrToMinutes, formatTimeRange } from "@/lib/time";

// Hit by an external scheduler (see README) every few minutes. Finds jobs
// whose start time falls within the reminder window and haven't already
// been texted today, then texts the assigned cleaner once.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const minutesBefore = Number(process.env.REMINDER_MINUTES_BEFORE ?? "30");
  const date = todayStr();
  const nowMin = nowMinutesOfDay();

  const candidates = await prisma.job.findMany({
    where: { startTime: { not: null }, assignedToId: { not: null } },
    include: { assignedTo: true, reminders: { where: { date } } },
  });

  let sent = 0;
  for (const job of candidates) {
    if (!job.startTime || !job.assignedTo) continue;
    if (job.reminders.length > 0) continue; // already reminded today

    const startMin = timeStrToMinutes(job.startTime);
    const windowStart = startMin - minutesBefore;
    if (nowMin < windowStart || nowMin >= startMin) continue;

    const addrLine = [job.address, job.city, job.state].filter(Boolean).join(", ");
    const label = job.property || addrLine || "your next clean";
    const time = formatTimeRange(job.startTime, null);

    const result = await sendSms(
      job.assignedTo.phone,
      `BAB Tasker: It's almost time for your clean at ${label} (${time}).`
    );

    await prisma.jobReminder.create({ data: { jobId: job.id, date } });
    if (result.sent) sent++;
  }

  return NextResponse.json({ checked: candidates.length, sent, date, nowMin });
}

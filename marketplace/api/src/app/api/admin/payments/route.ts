import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin account required" }, { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    include: {
      jobRequest: {
        include: {
          homeowner: { include: { user: true } },
          cleaner: { include: { user: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(payments);
}

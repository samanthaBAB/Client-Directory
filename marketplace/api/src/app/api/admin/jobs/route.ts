import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

const VALID_STATUSES = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const;

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin account required" }, { status: 403 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const status = VALID_STATUSES.find((s) => s === statusParam);

  const jobs = await prisma.jobRequest.findMany({
    where: status ? { status } : undefined,
    include: {
      address: true,
      homeowner: { include: { user: true } },
      cleaner: { include: { user: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(jobs);
}

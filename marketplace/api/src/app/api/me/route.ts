import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let hasBookedBefore: boolean | undefined;
  if (user.homeownerProfile) {
    const priorJobCount = await prisma.jobRequest.count({ where: { homeownerId: user.homeownerProfile.id } });
    hasBookedBefore = priorJobCount > 0;
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    homeownerProfile: user.homeownerProfile ? { ...user.homeownerProfile, hasBookedBefore } : null,
    cleanerProfile: user.cleanerProfile,
  });
}

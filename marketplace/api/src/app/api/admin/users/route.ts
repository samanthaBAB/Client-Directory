import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin account required" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { role: { in: ["HOMEOWNER", "CLEANER"] } },
    include: { homeownerProfile: true, cleanerProfile: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      disabled: u.disabled,
      disabledReason: u.disabledReason,
      createdAt: u.createdAt,
      cleaner: u.cleanerProfile
        ? {
            stripeOnboarded: u.cleanerProfile.stripeOnboarded,
            ratingAvg: u.cleanerProfile.ratingAvg,
            ratingCount: u.cleanerProfile.ratingCount,
            serviceRadiusMi: u.cleanerProfile.serviceRadiusMi,
          }
        : null,
    })),
  );
}

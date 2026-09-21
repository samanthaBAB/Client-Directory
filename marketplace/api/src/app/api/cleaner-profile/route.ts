import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

const patchSchema = z.object({
  baseLat: z.number().min(-90).max(90).optional(),
  baseLng: z.number().min(-180).max(180).optional(),
  serviceRadiusMi: z.number().int().min(1).max(100).optional(),
  bio: z.string().max(1000).optional(),
  hourlyRateCents: z.number().int().min(500).max(50000).optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "CLEANER" || !user.cleanerProfile) {
    return NextResponse.json({ error: "Cleaner account required" }, { status: 403 });
  }

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.cleanerProfile.update({
    where: { id: user.cleanerProfile.id },
    data: body.data,
  });

  return NextResponse.json(updated);
}

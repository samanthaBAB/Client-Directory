import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

const schema = z.object({ pushToken: z.string().min(1) });

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { pushToken: body.data.pushToken } });
  return NextResponse.json({ ok: true });
}

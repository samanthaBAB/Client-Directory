import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

const schema = z.object({
  disabled: z.boolean(),
  reason: z.string().max(500).optional(),
});

// Manual account enable/disable — mainly for a reported no-show, which
// (unlike a late cancellation) can't be auto-detected without a
// check-in feature this app doesn't have yet, so it's a human judgment
// call an admin makes from a homeowner's report.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthedUser(req);
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin account required" }, { status: 403 });
  }
  const { id } = await params;

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role === "ADMIN") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      disabled: body.data.disabled,
      disabledReason: body.data.disabled ? (body.data.reason ?? "Disabled by support") : null,
    },
  });

  return NextResponse.json({ id: updated.id, disabled: updated.disabled, disabledReason: updated.disabledReason });
}

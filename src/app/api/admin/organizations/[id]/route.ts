import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/authz";
import { serializeOrganization } from "@/lib/serialize";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("name" in body && String(body.name).trim()) data.name = String(body.name).trim();
  if ("propertyLimit" in body) {
    const v = Number(body.propertyLimit);
    if (!Number.isFinite(v) || v <= 0) {
      return NextResponse.json({ error: "Property limit must be a positive number" }, { status: 400 });
    }
    data.propertyLimit = v;
  }
  if ("monthlyPriceCents" in body) {
    const v = Number(body.monthlyPriceCents);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "Monthly price is invalid" }, { status: 400 });
    }
    data.monthlyPriceCents = v;
  }
  if ("status" in body && ["TRIAL", "ACTIVE", "SUSPENDED"].includes(body.status)) {
    data.status = body.status;
  }
  if ("notes" in body) data.notes = body.notes?.trim() || null;

  const updated = await prisma.organization.update({
    where: { id },
    data,
    include: { _count: { select: { users: true, jobs: true } } },
  });

  return NextResponse.json(serializeOrganization(updated));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.organization.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

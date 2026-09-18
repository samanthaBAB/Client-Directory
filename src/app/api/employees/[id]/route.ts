import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeUser } from "@/lib/serialize";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId || !isOwnerLevel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if ("phone" in body) data.phone = body.phone ? String(body.phone).trim() : null;
  if ("name" in body && String(body.name).trim()) data.name = String(body.name).trim();

  // Only the owner can promote/demote admins, matching the original app's rule.
  if ("isAdmin" in body) {
    if (session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Only the owner can change admin status" }, { status: 403 });
    }
    data.role = body.isAdmin ? "ADMIN" : "EMPLOYEE";
  }

  const updated = await prisma.user.update({ where: { id }, data });
  return NextResponse.json(serializeUser(updated));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.organizationId || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can remove employees" }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

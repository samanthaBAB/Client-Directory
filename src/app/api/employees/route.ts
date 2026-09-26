import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializeUser } from "@/lib/serialize";

function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url"); // ~8 url-safe chars
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId || !isOwnerLevel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employees = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId, role: { in: ["EMPLOYEE", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assignedJobs: true } } },
  });

  return NextResponse.json(
    employees.map((e) => ({ ...serializeUser(e), jobCount: e._count.assignedJobs }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.organizationId || !isOwnerLevel(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").toLowerCase().trim();
  const phone = body.phone ? String(body.phone).trim() : null;
  // Standard cut for a new cleaner unless the owner sets something else:
  // 25% off the price, minus $5, rounded up to the nearest dollar.
  const payoutPercent = body.payoutPercent != null ? Number(body.payoutPercent) : 25;
  const payoutFlatFee = body.payoutFlatFee != null ? Number(body.payoutFlatFee) : 5;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const employee = await prisma.user.create({
    data: {
      name, email, phone, passwordHash,
      role: "EMPLOYEE",
      mustChangePw: true,
      organizationId: session.user.organizationId,
      payoutPercent,
      payoutFlatFee,
    },
  });

  return NextResponse.json(
    { ...serializeUser(employee), jobCount: 0, tempPassword },
    { status: 201 }
  );
}

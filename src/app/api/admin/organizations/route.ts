import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/authz";
import { serializeOrganization } from "@/lib/serialize";

function generateTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, jobs: true } } },
  });
  return NextResponse.json(orgs.map(serializeOrganization));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const orgName = String(body.orgName ?? "").trim();
  const ownerName = String(body.ownerName ?? "").trim();
  const ownerEmail = String(body.ownerEmail ?? "").toLowerCase().trim();
  const propertyLimit = Number(body.propertyLimit);
  const monthlyPriceCents = Number(body.monthlyPriceCents);

  if (!orgName) return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  if (!ownerName) return NextResponse.json({ error: "Owner name is required" }, { status: 400 });
  if (!ownerEmail) return NextResponse.json({ error: "Owner email is required" }, { status: 400 });
  if (!Number.isFinite(propertyLimit) || propertyLimit <= 0) {
    return NextResponse.json({ error: "Property limit must be a positive number" }, { status: 400 });
  }
  if (!Number.isFinite(monthlyPriceCents) || monthlyPriceCents < 0) {
    return NextResponse.json({ error: "Monthly price is invalid" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (existing) return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const org = await prisma.organization.create({
    data: {
      name: orgName,
      propertyLimit,
      monthlyPriceCents,
      notes: body.notes?.trim() || null,
      users: {
        create: {
          name: ownerName,
          email: ownerEmail,
          passwordHash,
          role: "OWNER",
          mustChangePw: true,
        },
      },
    },
    include: { _count: { select: { users: true, jobs: true } } },
  });

  return NextResponse.json(
    { ...serializeOrganization(org), ownerEmail, tempPassword },
    { status: 201 }
  );
}

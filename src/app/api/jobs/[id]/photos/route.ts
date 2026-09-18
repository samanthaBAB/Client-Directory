import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerLevel } from "@/lib/authz";
import { serializePhoto } from "@/lib/serialize";

const MAX_DATA_URL_LENGTH = 1_500_000; // ~1.1MB decoded, generous ceiling for a compressed photo

async function assertAccess(jobId: string, userId: string, owner: boolean) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return null;
  if (!owner && job.assignedToId !== userId) return null;
  return job;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await assertAccess(id, session.user.id, isOwnerLevel(session.user.role));
  if (!job) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const photos = await prisma.photo.findMany({ where: { jobId: id }, orderBy: { uploadedAt: "asc" } });
  return NextResponse.json(photos.map(serializePhoto));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await assertAccess(id, session.user.id, isOwnerLevel(session.user.role));
  if (!job) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const dataUrl = String(body.dataUrl ?? "");
  if (!dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Invalid image data" }, { status: 400 });
  }
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }

  const photo = await prisma.photo.create({ data: { jobId: id, dataUrl } });
  return NextResponse.json(serializePhoto(photo), { status: 201 });
}

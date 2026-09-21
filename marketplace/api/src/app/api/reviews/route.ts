import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";

const schema = z.object({
  jobRequestId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "HOMEOWNER" || !user.homeownerProfile) {
    return NextResponse.json({ error: "Homeowner account required" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { jobRequestId, rating, comment } = body.data;

  const job = await prisma.jobRequest.findUnique({
    where: { id: jobRequestId },
    include: { cleaner: { include: { user: true } } },
  });
  if (!job || job.homeownerId !== user.homeownerProfile.id) {
    return NextResponse.json({ error: "Not your job" }, { status: 403 });
  }
  if (job.status !== "COMPLETED") {
    return NextResponse.json({ error: "Job isn't completed yet" }, { status: 409 });
  }
  if (!job.cleaner) {
    return NextResponse.json({ error: "Job has no cleaner" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      jobRequestId,
      rating,
      comment,
      fromUserId: user.id,
      toUserId: job.cleaner.user.id,
    },
  });

  const cleaner = job.cleaner;
  const newCount = cleaner.ratingCount + 1;
  const newAvg = ((cleaner.ratingAvg ?? 0) * cleaner.ratingCount + rating) / newCount;
  await prisma.cleanerProfile.update({
    where: { id: cleaner.id },
    data: { ratingCount: newCount, ratingAvg: newAvg },
  });

  return NextResponse.json(review, { status: 201 });
}

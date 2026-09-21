import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";
import { haversineMiles } from "@/lib/geo";
import { sendPushToMany } from "@/lib/push";

// Flat platform rate used to price a job before a cleaner is assigned.
// (A cleaner's own hourlyRateCents only affects what they see they'd earn;
// keeping the price a homeowner sees stable regardless of who accepts.)
const PLATFORM_RATE_CENTS_PER_HOUR = 5000;

const createSchema = z.object({
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    notes: z.string().optional(),
    // Captured from the device's current location when the homeowner taps
    // "use my current location" — optional. Without it, this job can't be
    // distance-filtered for cleaners and shows up in every cleaner's feed
    // regardless of their service radius.
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  serviceType: z.enum(["standard", "deep", "move-out"]),
  scheduledFor: z.string().datetime(),
  estimatedHours: z.number().min(0.5).max(12).default(2),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user || user.role !== "HOMEOWNER" || !user.homeownerProfile) {
    return NextResponse.json({ error: "Homeowner account required" }, { status: 403 });
  }

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }
  const { address, serviceType, scheduledFor, estimatedHours, notes } = body.data;

  const multiplier = serviceType === "deep" ? 1.5 : serviceType === "move-out" ? 1.75 : 1;
  const priceCents = Math.round(PLATFORM_RATE_CENTS_PER_HOUR * estimatedHours * multiplier);

  const createdAddress = await prisma.address.create({
    data: { ...address, homeownerId: user.homeownerProfile.id },
  });

  const job = await prisma.jobRequest.create({
    data: {
      homeownerId: user.homeownerProfile.id,
      addressId: createdAddress.id,
      serviceType,
      scheduledFor: new Date(scheduledFor),
      estimatedHours,
      priceCents,
      notes,
    },
    include: { address: true },
  });

  // Fire-and-forget: notify onboarded cleaners a new job is open. Not
  // radius-filtered per-cleaner here (that'd mean a query per cleaner) —
  // everyone gets notified, the feed itself is what's distance-filtered.
  const cleaners = await prisma.cleanerProfile.findMany({
    where: { stripeOnboarded: true },
    include: { user: true },
  });
  sendPushToMany(
    cleaners.map((c) => c.user.pushToken),
    {
      title: "New job near you",
      body: `${serviceType.replace("-", " ")} clean in ${address.city}, ${address.state} — $${(priceCents / 100).toFixed(2)}`,
      data: { jobId: job.id },
    },
  );

  return NextResponse.json(job, { status: 201 });
}

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "HOMEOWNER") {
    if (!user.homeownerProfile) return NextResponse.json({ error: "No profile" }, { status: 403 });
    const jobs = await prisma.jobRequest.findMany({
      where: { homeownerId: user.homeownerProfile.id },
      include: { address: true, cleaner: { include: { user: true } }, payment: true },
      orderBy: { scheduledFor: "desc" },
    });
    return NextResponse.json(jobs);
  }

  // CLEANER
  if (!user.cleanerProfile) return NextResponse.json({ error: "No profile" }, { status: 403 });
  const scope = req.nextUrl.searchParams.get("scope") ?? "available";

  if (scope === "mine") {
    const jobs = await prisma.jobRequest.findMany({
      where: { cleanerId: user.cleanerProfile.id },
      include: { address: true, homeowner: { include: { user: true } }, payment: true },
      orderBy: { scheduledFor: "desc" },
    });
    return NextResponse.json(jobs);
  }

  // "available": open job offers anyone with a cleaner profile can accept,
  // excluding ones this cleaner already declined.
  const declined = await prisma.jobDecline.findMany({
    where: { cleanerId: user.cleanerProfile.id },
    select: { jobRequestId: true },
  });
  const jobs = await prisma.jobRequest.findMany({
    where: { status: "PENDING", id: { notIn: declined.map((d) => d.jobRequestId) } },
    include: { address: true, homeowner: { include: { user: true } } },
    orderBy: { scheduledFor: "asc" },
  });

  // Distance-filter only when we have coordinates on both sides — a
  // cleaner who hasn't set a base location, or a job whose homeowner never
  // shared their location, falls back to being shown regardless of
  // distance rather than silently disappearing from every feed.
  const { baseLat, baseLng, serviceRadiusMi } = user.cleanerProfile;
  const filtered =
    baseLat == null || baseLng == null
      ? jobs
      : jobs.filter((job) => {
          if (job.address.lat == null || job.address.lng == null) return true;
          const miles = haversineMiles(
            { lat: baseLat, lng: baseLng },
            { lat: job.address.lat, lng: job.address.lng },
          );
          return miles <= serviceRadiusMi;
        });

  return NextResponse.json(filtered);
}

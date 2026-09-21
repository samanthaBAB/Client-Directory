import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthedUser } from "@/lib/auth";
import { haversineMiles } from "@/lib/geo";
import { sendPushToMany } from "@/lib/push";
import {
  availableExtras,
  computeDiscount,
  isActiveSubscription,
  isExtraId,
  isRoomPriced,
  isServiceTypeId,
  priceJobCents,
  serviceLabel,
} from "@/lib/catalog";

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
  serviceType: z.string().refine(isServiceTypeId, "Unknown service type"),
  squareFootage: z.number().int().min(100).max(50000),
  // Required for every service type except "commercial" (sq-ft-only pricing).
  bedroomCount: z.number().int().min(0).max(20).optional(),
  bathroomCount: z.number().min(0).max(20).optional(),
  kitchenCount: z.number().int().min(0).max(5).optional(),
  extras: z.array(z.string()).default([]),
  scheduledFor: z.string().datetime(),
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
  const { address, serviceType, squareFootage, bedroomCount, bathroomCount, kitchenCount, scheduledFor, notes } = body.data;
  // Silently drop any unknown extra id, or one already bundled into this
  // service type's room pricing (e.g. "inside_fridge" on a deep clean —
  // charging it again would double-bill the same work), rather than
  // erroring. Keeps this forward-compatible if the catalog changes too.
  const allowedExtraIds = new Set(availableExtras(serviceType).map((e) => e.id));
  const extras = body.data.extras.filter(isExtraId).filter((id) => allowedExtraIds.has(id));

  const roomsRequired = isRoomPriced(serviceType);
  if (roomsRequired && (bedroomCount == null || bathroomCount == null || kitchenCount == null)) {
    return NextResponse.json({ error: "Bedroom, bathroom, and kitchen counts are required for this service type" }, { status: 400 });
  }
  const rooms = roomsRequired ? { bedroomCount: bedroomCount!, bathroomCount: bathroomCount!, kitchenCount: kitchenCount! } : null;

  const subtotalCents = priceJobCents(serviceType, squareFootage, rooms, extras);

  const priorJobCount = await prisma.jobRequest.count({ where: { homeownerId: user.homeownerProfile.id } });
  const discount = computeDiscount(subtotalCents, {
    serviceType,
    isFirstClean: priorJobCount === 0,
    isSubscribed: isActiveSubscription(user.homeownerProfile.subscriptionStatus),
  });
  const priceCents = subtotalCents - (discount?.amountCents ?? 0);

  const createdAddress = await prisma.address.create({
    data: { ...address, homeownerId: user.homeownerProfile.id },
  });

  const job = await prisma.jobRequest.create({
    data: {
      homeownerId: user.homeownerProfile.id,
      addressId: createdAddress.id,
      serviceType,
      squareFootage,
      bedroomCount: rooms?.bedroomCount,
      bathroomCount: rooms?.bathroomCount,
      kitchenCount: rooms?.kitchenCount,
      extras,
      scheduledFor: new Date(scheduledFor),
      priceCents,
      discountLabel: discount?.label,
      discountCents: discount?.amountCents ?? 0,
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
      body: `${serviceLabel(serviceType)} in ${address.city}, ${address.state} — $${(priceCents / 100).toFixed(2)}`,
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

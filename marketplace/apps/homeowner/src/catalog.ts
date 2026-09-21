// The pricing catalog a homeowner's job is built from. Kept as code (not a
// DB table) since it changes rarely and every job needs to be priced from
// known, valid inputs — not arbitrary numbers a homeowner could type.
// Mirrored in both mobile apps (src/catalog.ts) so they can render the
// same options and a live, itemized price estimate; this file is the
// source of truth the backend actually prices and validates against.
//
// Pricing is flat and itemized, never hourly: a cleaner is paid the same
// for the job regardless of how long it actually takes, and a homeowner
// sees exactly what each part of the job costs before booking:
//
//   (square footage × price/sq ft for this service type)
//   + (bedroom count × per-bedroom price)      — residential-family types only
//   + (bathroom count × per-bathroom price)    — residential-family types only
//   + (kitchen count × per-kitchen price)      — residential-family types only
//   + any selected extras
//
// A "deep clean" kitchen/bathroom price bundles the detail work that
// defines a deep clean for that room (kitchen: inside the oven and every
// cabinet, not just wiped counters; bathroom: full scrub, baseboards,
// floors, dusting, fan) rather than charging those as separate add-ons —
// they're what makes it a deep clean, not optional extras. Commercial
// jobs don't have bedrooms, so they're priced by square footage alone.
//
// The numbers below are starting points for the Acadiana launch market —
// adjust the *_CENTS tables to match real quotes.

export type ServiceTypeId =
  | "residential"
  | "deep"
  | "move_in"
  | "move_out"
  | "commercial"
  | "vacation_rental";

// Service types priced per room (bedroom/bathroom/kitchen count) in
// addition to square footage. Commercial is square-footage-only.
export type RoomPricedServiceTypeId = Exclude<ServiceTypeId, "commercial">;

export const SERVICE_TYPES: { id: ServiceTypeId; label: string; blurb: string; pricingModel: "rooms" | "sqft-only" }[] = [
  { id: "residential", label: "Residential clean", blurb: "Kitchen, bathrooms, floors, dusting", pricingModel: "rooms" },
  { id: "deep", label: "Deep clean", blurb: "Inside the oven and every cabinet, full bathroom scrub, baseboards, fans — the detail work", pricingModel: "rooms" },
  { id: "move_in", label: "Move-in clean", blurb: "Empty home, deep-clean detail, ready before you unpack", pricingModel: "rooms" },
  { id: "move_out", label: "Move-out clean", blurb: "Empty home, deep-clean detail, ready for the next tenant", pricingModel: "rooms" },
  { id: "commercial", label: "Commercial clean", blurb: "Offices, storefronts, and other business spaces", pricingModel: "sqft-only" },
  { id: "vacation_rental", label: "Vacation rental turnover", blurb: "Fast, thorough turnover between short-term guests", pricingModel: "rooms" },
];

export function isServiceTypeId(id: string): id is ServiceTypeId {
  return SERVICE_TYPES.some((s) => s.id === id);
}

export function isRoomPriced(id: ServiceTypeId): id is RoomPricedServiceTypeId {
  return SERVICE_TYPES.find((s) => s.id === id)?.pricingModel === "rooms";
}

export function serviceLabel(id: string): string {
  return SERVICE_TYPES.find((s) => s.id === id)?.label ?? id;
}

// Cents per square foot, by service type — owner-set rates (priced above
// the raw Lafayette-area average on purpose, closer to the national
// per-sq-ft range). Note this stacks with the per-room pricing below, so
// the combined total runs higher than a sq-ft-only competitor's quote —
// e.g. a 2,000 sq ft 3-bed/2-bath standard clean prices at $200 (sq ft) +
// $95 (rooms) = $295 here.
export const PRICE_PER_SQFT_CENTS: Record<ServiceTypeId, number> = {
  residential: 10,
  deep: 20,
  move_in: 30,
  move_out: 30,
  commercial: 30,
  vacation_rental: 8,
};

// A floor under the sq-ft + room math above so a tiny home never prices
// below what a visit is actually worth to send a cleaner out for.
export const MIN_PRICE_CENTS: Record<ServiceTypeId, number> = {
  residential: 12000,
  deep: 18000,
  move_in: 22000,
  move_out: 22000,
  commercial: 20000,
  vacation_rental: 9000,
};

export const BEDROOM_CENTS: Record<RoomPricedServiceTypeId, number> = {
  residential: 1500,
  // $40: strip + wash + remake bed, dust every surface/fixture, baseboards,
  // windows, mini blinds, door frames, wall spot-cleaning, floor — roughly
  // 45–60 min of real work. At the cleaner's 85% payout share (see the
  // platform fee in payments/create-intent), $40 nets them ~$34, close to
  // a $30–35/hr rate for that time. See DEEP_CLEAN_TASKS below for the
  // exact checklist shown to homeowners and cleaners.
  deep: 4000,
  move_in: 4000,
  move_out: 4000,
  vacation_rental: 1200,
};

export const BATHROOM_CENTS: Record<RoomPricedServiceTypeId, number> = {
  residential: 2000,
  // $50: scrub sink, tub, and toilet, light fixtures, vents, floors,
  // baseboards, windows & mini blinds if present, shower curtain & liner
  // if needed — the most physically demanding room per square foot,
  // 50–60 min of real scrubbing. Nets the cleaner ~$42 at their 85% share.
  deep: 5000,
  move_in: 5000,
  move_out: 5000,
  vacation_rental: 1800,
};

export const KITCHEN_CENTS: Record<RoomPricedServiceTypeId, number> = {
  residential: 2000,
  // $65: the hardest room in a deep clean — inside & outside every
  // cabinet, scrub the sink, wash dirty dishes, inside the
  // fridge/freezer, inside the oven, stovetop, countertops, baseboards,
  // floor. ~65–85 min. Nets the cleaner ~$55 at their 85% share.
  deep: 6500,
  move_in: 6500,
  move_out: 6500,
  vacation_rental: 2000,
};

// The exact checklist a deep clean (and move-in/move-out, which use the
// same room prices above) covers per room — shown to the homeowner so
// they know what they're paying for, and to the cleaner so they know
// what's expected. Defined for "deep" specifically since that's the tier
// with a fully spelled-out scope so far; residential/vacation_rental show
// their shorter blurb from SERVICE_TYPES instead.
//
// "general" covers every other room (living room, dining room, hallways,
// entryway) — this is what the square-footage portion of the price pays
// for, not a separately priced line item.
export const DEEP_CLEAN_TASKS: Record<"general" | "bedroom" | "bathroom" | "kitchen", string[]> = {
  general: [
    "Dust every room",
    "Clean windows",
    "Wet-wipe mini blinds",
    "Wet-wipe baseboards",
    "Clean ceiling fans",
    "Dust & clean all furniture",
    "Wipe door frames & doors",
    "Spot-clean walls",
    "Vacuum & mop floors",
  ],
  bedroom: [
    "Strip and remake the bed",
    "Wash sheets & blankets",
    "Dust every surface & fixture",
    "Wipe baseboards",
    "Clean windows",
    "Clean mini blinds",
    "Wipe door frames",
    "Spot-clean walls",
    "Vacuum & mop floor",
  ],
  bathroom: [
    "Scrub the sink",
    "Scrub the tub/shower",
    "Scrub the toilet",
    "Clean light fixtures",
    "Clean vents",
    "Wipe baseboards",
    "Vacuum & mop floor",
    "Clean windows & mini blinds (if present)",
    "Wash shower curtain & liner (if needed)",
  ],
  kitchen: [
    "Inside every cabinet",
    "Outside of every cabinet",
    "Scrub the sink",
    "Wash dirty dishes",
    "Inside the refrigerator & freezer",
    "Inside the oven",
    "Stovetop",
    "Countertops",
    "Wipe baseboards",
    "Vacuum & mop floor",
  ],
};

// Add-ons that are genuinely separate from any specific room, and make
// sense as an optional extra regardless of service type (unlike
// baseboards/mini blinds in bedrooms, or the oven/cabinets/fridge/dishes
// in a deep-clean kitchen, which are baked into room pricing above).
export type ExtraId = "inside_fridge" | "blinds" | "laundry" | "dishes" | "garage" | "patio_balcony";

export const EXTRAS: { id: ExtraId; label: string; priceCents: number; bundledIn?: ServiceTypeId[] }[] = [
  // Already covered by the kitchen line item for deep/move-in/move-out —
  // offering them as a paid extra there would double-charge for the same
  // work, so they're hidden for those service types (see availableExtras).
  { id: "inside_fridge", label: "Inside refrigerator", priceCents: 2000, bundledIn: ["deep", "move_in", "move_out"] },
  { id: "dishes", label: "Dishes", priceCents: 1000, bundledIn: ["deep", "move_in", "move_out"] },
  { id: "blinds", label: "Blinds (living areas)", priceCents: 1500 },
  { id: "laundry", label: "Laundry (wash & fold)", priceCents: 2000 },
  { id: "garage", label: "Garage sweep", priceCents: 2000 },
  { id: "patio_balcony", label: "Patio / balcony", priceCents: 1500 },
];

export function isExtraId(id: string): id is ExtraId {
  return EXTRAS.some((e) => e.id === id);
}

/** Extras worth offering for this service type — excludes ones already bundled into its room pricing. */
export function availableExtras(serviceType: ServiceTypeId) {
  return EXTRAS.filter((e) => !e.bundledIn?.includes(serviceType));
}

export type RoomCounts = { bedroomCount: number; bathroomCount: number; kitchenCount: number };

export type PriceLineItem = { label: string; amountCents: number };

/** Full itemized breakdown — what the app shows the homeowner and cleaner, not just a total. */
export function priceBreakdown(
  serviceType: ServiceTypeId,
  squareFootage: number,
  rooms: RoomCounts | null,
  extras: string[],
): PriceLineItem[] {
  const items: PriceLineItem[] = [
    { label: `${squareFootage.toLocaleString()} sq ft`, amountCents: Math.round(PRICE_PER_SQFT_CENTS[serviceType] * squareFootage) },
  ];

  if (isRoomPriced(serviceType)) {
    if (!rooms) throw new Error("Room counts required for this service type");
    if (rooms.bedroomCount > 0) {
      items.push({
        label: `${rooms.bedroomCount} bedroom${rooms.bedroomCount === 1 ? "" : "s"}`,
        amountCents: rooms.bedroomCount * BEDROOM_CENTS[serviceType],
      });
    }
    if (rooms.bathroomCount > 0) {
      items.push({
        label: `${rooms.bathroomCount} bathroom${rooms.bathroomCount === 1 ? "" : "s"}`,
        amountCents: rooms.bathroomCount * BATHROOM_CENTS[serviceType],
      });
    }
    if (rooms.kitchenCount > 0) {
      items.push({
        label: rooms.kitchenCount === 1 ? "Kitchen" : `${rooms.kitchenCount} kitchens`,
        amountCents: rooms.kitchenCount * KITCHEN_CENTS[serviceType],
      });
    }
  }

  for (const id of extras) {
    const extra = EXTRAS.find((e) => e.id === id);
    if (extra) items.push({ label: extra.label, amountCents: extra.priceCents });
  }

  const subtotal = items.reduce((sum, item) => sum + item.amountCents, 0);
  const minimum = MIN_PRICE_CENTS[serviceType];
  if (subtotal < minimum) {
    items.push({ label: "Minimum job adjustment", amountCents: minimum - subtotal });
  }

  return items;
}

export function priceJobCents(
  serviceType: ServiceTypeId,
  squareFootage: number,
  rooms: RoomCounts | null,
  extras: string[],
): number {
  return priceBreakdown(serviceType, squareFootage, rooms, extras).reduce((sum, item) => sum + item.amountCents, 0);
}

// --- Promotions -------------------------------------------------------
//
// New-customer discount is deliberately scoped to "residential" (standard)
// cleans only — not deep, move-in/out, commercial, or vacation rental —
// per the owner's call: it's an intro offer for the everyday service, not
// a discount on higher-labor jobs. If a new customer's very first booking
// happens to be something other than a standard clean, they simply don't
// get it (their "first clean" doesn't get banked for later).
//
// The subscriber discount applies to every service type.
//
// NOTE on cleaner pay: priceCents already has the discount subtracted,
// and the cleaner is paid 85% of priceCents same as any job (see
// application_fee_amount in payments/create-intent) — so today a promo
// reduces the cleaner's payout proportionally along with the platform's
// cut, it isn't absorbed by the platform alone. Flagged as a deliberate
// simplification, not settled product policy — revisit if the intent is
// for cleaners to be fully insulated from promotional pricing.
export function computeDiscount(
  subtotalCents: number,
  opts: { serviceType: ServiceTypeId; isFirstClean: boolean; isSubscribed: boolean },
): { label: string; amountCents: number } | null {
  if (opts.isFirstClean && opts.serviceType === "residential") {
    return { label: "New customer — first clean 50% off", amountCents: Math.round(subtotalCents * 0.5) };
  }
  if (opts.isSubscribed) {
    return { label: "Monthly subscriber — 25% off", amountCents: Math.round(subtotalCents * 0.25) };
  }
  return null;
}

// --- Monthly subscription ---------------------------------------------
//
// $14.99/mo, first month free (see MONTHLY_SUBSCRIPTION_TRIAL_DAYS):
// unlimited cleanings that month, each still billed separately at 25%
// off (computeDiscount above). Priced to pay for itself after roughly
// one discounted booking (25% off a ~$100+ standard clean is already
// ~$25+), so it's an easy yes for anyone who books more than once a
// month, while still being real recurring revenue on its own. Billed via
// Stripe Subscriptions (STRIPE_SUBSCRIPTION_PRICE_ID env var — create the
// Product/Price once in the Stripe Dashboard, this app only references
// it) — see src/app/api/subscription/.
export const MONTHLY_SUBSCRIPTION_PRICE_CENTS = 1499;
export const MONTHLY_SUBSCRIPTION_TRIAL_DAYS = 30;

// Stripe's subscription status is "trialing" during the free month and
// "active" once real billing starts — both grant the 25% discount, so
// callers should use this rather than checking `=== "active"` directly.
export function isActiveSubscription(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

// --- Cleaner policies ---------------------------------------------------
//
// Shown in the cleaner app (Profile/Support) and enforced in
// src/app/api/jobs/[id]/cleaner-cancel/route.ts (late cancellation) and
// via the admin dashboard's disable/enable action (no-shows, which can't
// be auto-detected without a check-in feature this app doesn't have yet).
export const CLEANER_POLICIES: string[] = [
  "Canceling an accepted job within 24 hours of its scheduled time disables your account.",
  "Not showing up to an accepted job disables your account.",
  "If your account is disabled and you believe it was a mistake, contact support below.",
];

// Placeholder — replace with the real support line/inbox before launch.
// Never presented as real contact info anywhere except here; both apps
// read from this single source so there's one place to update it.
export const SUPPORT_CONTACT = {
  phone: "+10000000000", // TODO: replace with a real support phone number
  phoneDisplay: "(000) 000-0000", // TODO
  email: "support@sudsandscrub.com", // TODO: confirm this inbox exists
};

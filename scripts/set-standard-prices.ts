import { PrismaClient } from "@prisma/client";
import { calculatePayout } from "../src/lib/payout";
import { describeRecurrence } from "../src/lib/recurrence";

const prisma = new PrismaClient();

const STR_TYPE = "Short-Term / Vacation Rental Cleaning";
const RESIDENTIAL = "Residential Cleaning";

async function findOrCreate(
  organizationId: string,
  customer: string,
  address: string,
  extra: Record<string, unknown> = {}
) {
  const existing = await prisma.job.findFirst({ where: { organizationId, customer, address } });
  if (existing) return { job: existing, created: false };
  const job = await prisma.job.create({ data: { organizationId, customer, address, ...extra } });
  return { job, created: true };
}

// Recomputes payout from the job's current assignee (if any) and the given
// price, so a standing-rate update stays consistent with whoever's on it.
async function priceIt(jobId: string, price: string, serviceType: string) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  let payout = job.payout;
  if (job.assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: job.assignedToId } });
    if (assignee) payout = calculatePayout(price, assignee.payoutPercent, assignee.payoutFlatFee) ?? job.payout;
  }
  await prisma.job.update({ where: { id: jobId }, data: { price, serviceType, payout } });
}

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);
  const orgId = owner.organizationId;

  // Madeline Fontenot — already exists in the app (per Samantha). Look her
  // up by customer name alone in case the address on file differs, and set
  // her real recurring schedule: every Mon/Wed/Fri 6:30-9:30am, solely hers.
  const madeline = await prisma.job.findFirst({ where: { organizationId: orgId, customer: "Madeline Fontenot" } });
  if (!madeline) {
    console.log("SKIPPED: Madeline Fontenot not found under that exact customer name — check spelling in the app.");
  } else {
    const recurrence = { recurrenceType: "WEEKLY", recurrenceDays: [1, 3, 5], recurrenceOrdinals: [], recurrenceAnchor: null };
    await prisma.job.update({
      where: { id: madeline.id },
      data: {
        address: "103 Dusty Ridge Drive",
        price: "$20/hr",
        serviceType: RESIDENTIAL,
        startTime: "06:30",
        endTime: "09:30",
        schedule: describeRecurrence(recurrence),
        ...recurrence,
        assignedToId: owner.id,
        assignmentStatus: "ACCEPTED",
      },
    });
    console.log("Madeline Fontenot — 103 Dusty Ridge Drive: $20/hr, Residential, every Mon/Wed/Fri 6:30-9:30am, Samantha (updated).");
  }

  // Becky Sanders — new to the app (exists in QuickBooks only so far),
  // $20/hr residential, every Thursday at 3pm, solely Samantha's.
  const { job: becky, created: beckyCreated } = await findOrCreate(orgId, "Becky Sanders", "103 1/2 Vital Street");
  const beckyRecurrence = { recurrenceType: "WEEKLY", recurrenceDays: [4], recurrenceOrdinals: [], recurrenceAnchor: null };
  await prisma.job.update({
    where: { id: becky.id },
    data: {
      price: "$20/hr",
      serviceType: RESIDENTIAL,
      startTime: "15:00",
      schedule: describeRecurrence(beckyRecurrence),
      ...beckyRecurrence,
      assignedToId: owner.id,
      assignmentStatus: "ACCEPTED",
    },
  });
  console.log(`Becky Sanders — 103 1/2 Vital Street: $20/hr, Residential, every Thursday 3pm, Samantha${beckyCreated ? " (created)" : " (updated)"}.`);

  // Faye Veverka, Nicole Ferguson — $125 residential each, already exist from earlier scripts.
  for (const [customer, address] of [
    ["Faye Veverka", "3277 Bella Road"],
    ["Nicole Ferguson", "817 Omega Drive"],
  ] as const) {
    const job = await prisma.job.findFirst({ where: { organizationId: orgId, customer, address } });
    if (!job) {
      console.log(`SKIPPED: ${customer} — ${address} not found. Run its add-*.ts script first.`);
      continue;
    }
    await priceIt(job.id, "$125", RESIDENTIAL);
    console.log(`${customer} — ${address}: $125, Residential Cleaning (updated).`);
  }

  // Megan Perkins — also fixing the street name (Bon Vie, not Bonvide).
  const megan = await prisma.job.findFirst({
    where: { organizationId: orgId, customer: "Megan Perkins", address: "201 Bonvide Drive" },
  });
  if (megan) {
    await prisma.job.update({ where: { id: megan.id }, data: { address: "201 Bon Vie Drive" } });
    await priceIt(megan.id, "$125", RESIDENTIAL);
    console.log("Megan Perkins — 201 Bon Vie Drive: $125, Residential Cleaning (address corrected, updated).");
  } else {
    console.log("SKIPPED: Megan Perkins job not found. Run add-megan-perkins-job.ts first.");
  }

  // Teresa LeBlanc, 804 Barrow Street — reaffirm $100 STR on both her job rows.
  const teresaJobs = await prisma.job.findMany({
    where: { organizationId: orgId, customer: "Teresa LeBlanc", address: "804 Barrow Street" },
  });
  for (const job of teresaJobs) {
    await priceIt(job.id, "$100", STR_TYPE);
  }
  console.log(`Teresa LeBlanc — 804 Barrow Street: $100, Short-Term Vacation Rental (confirmed on ${teresaJobs.length} job(s)).`);

  // Every Lynne Bermel property EXCEPT her residence (which has no address
  // yet, stored under `property` instead) — $120, all short-term rentals.
  const lynneStr = await prisma.job.findMany({
    where: { organizationId: orgId, customer: "Lynne Bermel", address: { not: null } },
  });
  for (const job of lynneStr) {
    await priceIt(job.id, "$120", STR_TYPE);
  }
  console.log(`Lynne Bermel — ${lynneStr.length} short-term rental propert${lynneStr.length === 1 ? "y" : "ies"}: $120 each, confirmed.`);

  // Lynne's residence (address still pending) — reaffirm $200 residential.
  const lynneResidence = await prisma.job.findFirst({
    where: { organizationId: orgId, customer: "Lynne Bermel", property: "Residence (address pending)" },
  });
  if (lynneResidence) {
    await priceIt(lynneResidence.id, "$200", RESIDENTIAL);
    console.log("Lynne Bermel — Residence (address pending): $200, Residential Cleaning (confirmed).");
  }

  console.log("\nNote: Tanya's 103 Oak Branch Street job is intentionally left with no price (invoiced separately) — untouched.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

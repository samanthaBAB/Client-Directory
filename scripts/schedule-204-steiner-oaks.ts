import { PrismaClient } from "@prisma/client";
import { calculatePayout } from "../src/lib/payout";
import { describeRecurrence } from "../src/lib/recurrence";

const prisma = new PrismaClient();

const KIRSTIN_EMAIL = "kirstin.nash@icloud.com";

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const kirstin = await prisma.user.findUnique({ where: { email: KIRSTIN_EMAIL } });
  if (!kirstin) throw new Error(`Kirstin account (${KIRSTIN_EMAIL}) not found.`);

  const job = await prisma.job.findFirst({
    where: { organizationId: owner.organizationId, customer: "Lynne Bermel", address: "204 Steiner Oaks" },
  });
  if (!job) throw new Error("204 Steiner Oaks wasn't found — run recreate-121-204.ts first if it hasn't been.");

  const recurrence = { recurrenceType: "ONCE", recurrenceDays: [], recurrenceOrdinals: [], recurrenceAnchor: "2026-09-29" };
  const payout = calculatePayout(job.price, kirstin.payoutPercent, kirstin.payoutFlatFee);

  // Time left as-is per Samantha — not touching startTime/endTime here.
  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      schedule: describeRecurrence(recurrence),
      ...recurrence,
      assignedToId: kirstin.id,
      assignmentStatus: "PENDING",
      payout,
    },
  });

  console.log(`${updated.address} scheduled for ${recurrence.recurrenceAnchor}, assigned to ${kirstin.name}.`);
  console.log(`Price ${updated.price}, payout: ${updated.payout}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

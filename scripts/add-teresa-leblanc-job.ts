import { PrismaClient } from "@prisma/client";
import { calculatePayout } from "../src/lib/payout";
import { describeRecurrence } from "../src/lib/recurrence";

const prisma = new PrismaClient();

const STR_TYPE = "Short-Term / Vacation Rental Cleaning";
const KIRSTIN_EMAIL = "kirstin.nash@icloud.com";

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const kirstin = await prisma.user.findUnique({ where: { email: KIRSTIN_EMAIL } });
  if (!kirstin) throw new Error(`Kirstin account (${KIRSTIN_EMAIL}) not found.`);

  const price = "$100";
  const payout = calculatePayout(price, kirstin.payoutPercent, kirstin.payoutFlatFee);
  const recurrence = { recurrenceType: "ONCE", recurrenceDays: [], recurrenceOrdinals: [], recurrenceAnchor: "2026-09-27" };

  const job = await prisma.job.create({
    data: {
      organizationId: owner.organizationId,
      customer: "Teresa LeBlanc",
      address: "804 Barrow Street",
      serviceType: STR_TYPE,
      price,
      payout,
      startTime: "10:00",
      endTime: "16:00",
      schedule: describeRecurrence(recurrence),
      ...recurrence,
      assignedToId: kirstin.id,
      assignmentStatus: "PENDING",
    },
  });

  console.log(`Created: ${job.customer} — ${job.address} on ${recurrence.recurrenceAnchor}`);
  console.log(`Price ${price}, payout to Kirstin: ${payout} (offered — she'll need to accept it in the app).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

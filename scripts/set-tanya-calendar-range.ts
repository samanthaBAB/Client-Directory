import { PrismaClient } from "@prisma/client";
import { describeRecurrence } from "../src/lib/recurrence";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const job = await prisma.job.findFirst({
    where: { organizationId: owner.organizationId, customer: "Tanya", address: "103 Oak Branch Street" },
  });
  if (!job) throw new Error("Tanya's 103 Oak Branch Street job wasn't found.");

  const recurrence = {
    recurrenceType: "DAILY_RANGE",
    recurrenceDays: [],
    recurrenceOrdinals: [],
    recurrenceAnchor: "2026-09-28|2026-10-16",
  };

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      schedule: describeRecurrence(recurrence),
      ...recurrence,
    },
  });

  console.log(`${updated.customer} — ${updated.address} will now show on every calendar day from 9/28 through 10/16.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

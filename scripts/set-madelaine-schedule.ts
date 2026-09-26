import { PrismaClient } from "@prisma/client";
import { describeRecurrence } from "../src/lib/recurrence";

const prisma = new PrismaClient();

// Correct spelling is "Madelaine," not "Madeline" — set-standard-prices.ts
// skipped her because of this mismatch.
async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const job = await prisma.job.findFirst({
    where: { organizationId: owner.organizationId, customer: { contains: "Madelaine", mode: "insensitive" } },
  });
  if (!job) throw new Error("No job found for Madelaine Fontenot under any spelling — check the Clients tab for her exact name.");

  const recurrence = { recurrenceType: "WEEKLY", recurrenceDays: [1, 3, 5], recurrenceOrdinals: [], recurrenceAnchor: null };

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      customer: "Madelaine Fontenot",
      address: "103 Dusty Ridge Drive",
      price: "$20/hr",
      serviceType: "Residential Cleaning",
      startTime: "06:30",
      endTime: "09:30",
      schedule: describeRecurrence(recurrence),
      ...recurrence,
      assignedToId: owner.id,
      assignmentStatus: "ACCEPTED",
    },
  });

  console.log(`${updated.customer} — ${updated.address}: $20/hr, Residential, every Mon/Wed/Fri 6:30-9:30am, Samantha.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

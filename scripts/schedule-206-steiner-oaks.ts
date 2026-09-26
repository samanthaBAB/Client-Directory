import { PrismaClient } from "@prisma/client";
import { describeRecurrence } from "../src/lib/recurrence";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const job = await prisma.job.findFirst({
    where: { organizationId: owner.organizationId, customer: "Lynne Bermel", address: "206 Steiner Oaks" },
  });
  if (!job) throw new Error("206 Steiner Oaks wasn't found.");

  const recurrence = { recurrenceType: "ONCE", recurrenceDays: [], recurrenceOrdinals: [], recurrenceAnchor: "2026-09-29" };

  // Time left as-is per Samantha — not touching startTime/endTime here.
  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      schedule: describeRecurrence(recurrence),
      ...recurrence,
      assignedToId: owner.id,
      assignmentStatus: "PENDING",
    },
  });

  console.log(`${updated.address} scheduled for ${recurrence.recurrenceAnchor}, assigned to ${owner.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

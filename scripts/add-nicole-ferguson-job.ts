import { PrismaClient } from "@prisma/client";
import { describeRecurrence } from "../src/lib/recurrence";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const recurrence = { recurrenceType: "ONCE", recurrenceDays: [], recurrenceOrdinals: [], recurrenceAnchor: "2026-09-30" };

  const job = await prisma.job.create({
    data: {
      organizationId: owner.organizationId,
      customer: "Nicole Ferguson",
      address: "817 Omega Drive",
      startTime: "10:00",
      schedule: describeRecurrence(recurrence),
      ...recurrence,
      assignedToId: owner.id,
      assignmentStatus: "PENDING",
    },
  });

  console.log(`Created: ${job.customer} — ${job.address} on ${recurrence.recurrenceAnchor} at 10am, assigned to ${owner.name}.`);
  console.log("No price or service type set yet — add those when known.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

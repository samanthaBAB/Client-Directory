import { PrismaClient } from "@prisma/client";
import { describeRecurrence } from "../src/lib/recurrence";

const prisma = new PrismaClient();

// Run add-lynne-residence.ts first — this updates that job, it doesn't create it.
async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const job = await prisma.job.findFirst({
    where: { organizationId: owner.organizationId, customer: "Lynne Bermel", property: "Residence (address pending)" },
  });
  if (!job) throw new Error("Lynne Bermel's residence job wasn't found — run add-lynne-residence.ts first.");

  const recurrence = { recurrenceType: "ONCE", recurrenceDays: [], recurrenceOrdinals: [], recurrenceAnchor: "2026-09-29" };

  const updated = await prisma.job.update({
    where: { id: job.id },
    data: {
      schedule: describeRecurrence(recurrence),
      ...recurrence,
      startTime: "08:00",
      assignedToId: owner.id,
      assignmentStatus: "ACCEPTED",
    },
  });

  console.log(`${updated.property} scheduled for ${recurrence.recurrenceAnchor} at 8am, assigned to ${owner.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

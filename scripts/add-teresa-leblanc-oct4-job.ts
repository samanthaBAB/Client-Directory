import { PrismaClient } from "@prisma/client";
import { describeRecurrence } from "../src/lib/recurrence";

const prisma = new PrismaClient();

const STR_TYPE = "Short-Term / Vacation Rental Cleaning";

// A second, separate one-time job for the same property/customer as
// add-teresa-leblanc-job.ts (that one is 9/27, assigned to Kirstin; this
// one is 10/4, assigned to Samantha) — the app has no per-occurrence
// assignee on a recurring job, so each date gets its own job row.
async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);

  const recurrence = { recurrenceType: "ONCE", recurrenceDays: [], recurrenceOrdinals: [], recurrenceAnchor: "2026-10-04" };

  const job = await prisma.job.create({
    data: {
      organizationId: owner.organizationId,
      customer: "Teresa LeBlanc",
      address: "804 Barrow Street",
      serviceType: STR_TYPE,
      price: "$100",
      startTime: "10:00",
      endTime: "16:00",
      schedule: describeRecurrence(recurrence),
      ...recurrence,
      assignedToId: owner.id,
      assignmentStatus: "PENDING",
    },
  });

  console.log(`Created: ${job.customer} — ${job.address} on ${recurrence.recurrenceAnchor}, assigned to ${owner.name}.`);
  console.log("Price defaulted to $100 (her usual rate here) and hours to 10am-4pm (her property's special exception) — confirm both.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

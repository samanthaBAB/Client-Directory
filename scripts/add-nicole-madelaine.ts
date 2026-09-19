import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase().trim();
  if (!ownerEmail) throw new Error("Set OWNER_EMAIL in .env before running this.");

  const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner || !owner.organizationId) throw new Error(`Owner account ${ownerEmail} not found or has no organization.`);
  const organizationId = owner.organizationId;

  const nicole = await prisma.job.create({
    data: {
      organizationId,
      customer: "Nicole Ferguson",
      address: "817 Omega Drive",
      serviceType: "Residential Cleaning",
      price: "$125",
      accessCode: "7325",
    },
  });
  console.log(`Added: ${nicole.customer} — ${nicole.address}`);

  const madelaine = await prisma.job.create({
    data: {
      organizationId,
      customer: "Madelaine Fontenot",
      address: "103 Dusty Ridge Drive",
      serviceType: "Residential Cleaning",
      price: "$20/hr",
      schedule: "Every Mon/Wed/Fri",
      startTime: "06:30",
      endTime: "09:30",
      recurrenceType: "WEEKLY",
      recurrenceDays: [1, 3, 5], // Mon, Wed, Fri
      assignedToId: owner.id,
      assignmentStatus: "ACCEPTED",
      notes: "Samantha personally cleans this property.",
    },
  });
  console.log(`Added: ${madelaine.customer} — ${madelaine.address}`);

  console.log("\nDone — added 2 clients.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
